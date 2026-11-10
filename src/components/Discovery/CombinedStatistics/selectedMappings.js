import { memberKey, sourceColumns } from "./columnMappings";
import { sourceKey } from "./combinedStatistics";

// Selection seeds a reviewable draft; saved combinations change only on Apply.
export function selectedMappings(mappings, sources, features = []) {
  let draft = mappings.map(group => ({ ...group, members: group.members.map(member => ({ ...member })) }));
  const selected = [...new Map(features.flatMap(feature => {
    const source = sources.find(source => sourceKey(source) === sourceKey(feature));
    const column = feature.originalName || feature.featureName;
    const available = source && sourceColumns(source).find(item => item.column === column && item.type);
    return available ? [[memberKey({ ...source, column }), {
      nodeId: source.nodeId, fileName: source.fileName, column, type: available.type,
    }]] : [];
  })).values()];
  if (!selected.length) return draft;
  const keys = new Set(selected.map(memberKey));
  const together = draft.some(group => selected.every(member => group.members.some(other => memberKey(other) === memberKey(member))));
  const compatible = new Set(selected.map(sourceKey)).size === selected.length && new Set(selected.map(member => member.type)).size === 1;
  const add = members => {
    const base = members[0].column;
    let label = base, suffix = 2;
    while (draft.some(group => group.label.toLowerCase() === label.toLowerCase())) label = `${base} (${suffix++})`;
    draft.push({ id: crypto.randomUUID(), label, type: members[0].type,
      members: members.map(({ type, ...member }) => member) });
  };
  if (selected.length > 1 && compatible && !together) {
    draft = draft.map(group => ({ ...group, members: group.members.filter(member => !keys.has(memberKey(member))) }))
      .filter(group => group.members.length >= 2);
    add(selected);
  } else {
    const used = new Set(draft.flatMap(group => group.members.map(memberKey)));
    const free = new Map();
    selected.filter(member => !used.has(memberKey(member))).forEach(member => {
      const key = JSON.stringify([member.column, member.type]);
      if (!free.has(key)) free.set(key, []);
      free.get(key).push(member);
    });
    free.forEach(add);
  }
  const relevant = group => group.members.some(member => keys.has(memberKey(member)));
  return [...draft.filter(relevant), ...draft.filter(group => !relevant(group))];
}
