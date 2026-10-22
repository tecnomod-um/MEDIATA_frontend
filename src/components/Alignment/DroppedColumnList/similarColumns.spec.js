import { describe, expect, it } from "vitest";
import { rankSimilarColumns } from "./similarColumns";

const column = (name, values, extras = {}) => ({
  nodeId: extras.nodeId || "n1", fileName: extras.fileName || "source.csv",
  column: name, values, ...extras,
});

describe("rankSimilarColumns", () => {
  it("uses matching SNOMED concepts even when names and values differ", () => {
    const anchor = column("ToiletBART1", ["0", "5", "10"], { terminology: "Ability to use toilet | 284899001" });
    const match = column("WC use", ["dependent", "independent"], { terminology: "Toileting ability | 284899001" });
    expect(rankSimilarColumns(anchor, [anchor, match])[0].column).toBe(match);
  });

  it("uses informative values and their annotations without relying on names", () => {
    const anchor = column("A", ["dependent", "needs help"], {
      valueTerminologies: { dependent: "Dependent | 111111" },
    });
    const match = column("B", ["dependent", "independent"], {
      valueTerminologies: { dependent: "Dependent | 111111" },
    });
    expect(rankSimilarColumns(anchor, [anchor, match])[0].reason).toBe("Shared value concepts");
  });

  it("does not suggest unrelated variables solely from type, range, or generic yes/no values", () => {
    const anchor = column("Smoke", ["Y", "N"]);
    const unrelated = column("Falls", ["Y", "N"]);
    const age = column("Age", ["integer", "min:0", "max:100"]);
    const income = column("Income", ["integer", "min:0", "max:100"]);
    expect(rankSimilarColumns(anchor, [anchor, unrelated])).toEqual([]);
    expect(rankSimilarColumns(age, [age, income])).toEqual([]);
  });

  it("does not confuse distinct Barthel activities because of a shared item suffix", () => {
    const anchor = column("ToiletBART1", ["integer", "min:0", "max:10"]);
    const related = column("ToiletBART2", ["integer", "min:0", "max:10"]);
    const unrelated = column("BladderBART1", ["integer", "min:0", "max:10"]);
    const ranked = rankSimilarColumns(anchor, [anchor, unrelated, related]);
    expect(ranked.map(({ column: match }) => match.column)).toEqual(["ToiletBART2"]);
  });

  it("does not promote an item-to-total match from semantics alone", () => {
    const anchor = column("ToiletBART1", ["integer", "min:0", "max:10"]);
    const item = column("ToiletBART2", ["integer", "min:0", "max:10"]);
    const total = column("TOTBarthel1", ["integer", "min:0", "max:100"]);
    const scores = [
      { nodeId: "n1", fileName: "source.csv", column: "ToiletBART2", score: 0.9 },
      { nodeId: "n1", fileName: "source.csv", column: "TOTBarthel1", score: 0.9 },
    ];
    expect(rankSimilarColumns(anchor, [anchor, item, total], [], scores)
      .map(({ column: match }) => match.column)).toEqual(["ToiletBART2"]);
  });

  it("accepts a strong semantic match and omits already selected columns", () => {
    const anchor = column("BI", ["integer"]);
    const match = column("Barthel Index", ["integer"], { fileName: "other.csv" });
    const scores = [{ nodeId: "n1", fileName: "other.csv", column: "Barthel Index", score: 0.63 }];
    expect(rankSimilarColumns(anchor, [anchor, match], [], scores)).toHaveLength(1);
    expect(rankSimilarColumns(anchor, [anchor, match], [match], scores)).toEqual([]);
  });

  it("rejects weak semantic similarity when other evidence is absent", () => {
    const anchor = column("Sex", ["Male", "Female"]);
    const unrelated = column("Stroke type", ["Ischemic", "Hemorrhagic"]);
    const scores = [{ nodeId: "n1", fileName: "source.csv", column: "Stroke type", score: 0.52 }];
    expect(rankSimilarColumns(anchor, [anchor, unrelated], [], scores)).toEqual([]);
  });
});
