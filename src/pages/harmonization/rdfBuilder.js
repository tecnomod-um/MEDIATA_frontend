import React, { useState } from "react";
import { saveMockFile } from "../../util/petitionHandler";

function RdfBuilder() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAndSendFile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.PUBLIC_URL}/resources/data/mock.csv`
      );
      const fileBlob = await response.blob();
      const file = new File([fileBlob], "mock.csv", { type: "text/csv" });
      const mockResult = await saveMockFile(file);
      setResult(mockResult);
    } catch (error) {
      console.error("Error generating mock file:", error);
      setResult("Error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={loadAndSendFile} disabled={isLoading}>
        {isLoading ? "Processing..." : "Save Mock File"}
      </button>
      {result && (
        <div>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default RdfBuilder;
