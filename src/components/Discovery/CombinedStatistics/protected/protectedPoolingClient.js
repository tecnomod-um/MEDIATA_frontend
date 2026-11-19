// Transport only: request the node's cached protected release for each source.
import { getApproximatePoolingSource } from "../../../../util/petitionHandler";

export async function loadApproximatePooling(members, nodes, filtersFor, signal) {
  const responses = await Promise.all(
    [...members].map(async ([key, member]) => {
      const node = nodes.find((item) => String(item.nodeId) === String(member.nodeId));
      if (!node?.serviceUrl) return [key, null];
      const filters = filtersFor(member);
      try {
        return [
          key,
          await getApproximatePoolingSource(
            member.fileName,
            filters,
            node.serviceUrl,
            signal,
            ...(member.featureTypes ? [member.featureTypes] : []),
          ),
        ];
      } catch (error) {
        if (signal?.aborted) throw error;
        const detail = error?.response?.data?.detail;
        return [
          key,
          { unavailable: typeof detail === "string" ? detail : "Protected statistics could not be requested." },
        ];
      }
    }),
  );
  return new Map(responses);
}
