import type { ExpertiseScore } from "@/schemas/skill-graph.schema";

export type RiskLevel = "low" | "medium" | "high";

/** Mirrors the backend's concentration → risk mapping (skill_graph_service.risk_level). */
export function riskLevel(topShare: number, contributorCount: number): RiskLevel {
  if (contributorCount <= 1 || topShare >= 0.8) return "high";
  if (topShare >= 0.5) return "medium";
  return "low";
}

function subsystemOf(filePath: string): string {
  const cleaned = filePath.replace(/^\/+/, "");
  const [head] = cleaned.split("/");
  return head || filePath;
}

export type SubsystemRisk = {
  subsystem: string;
  topContributorName: string;
  topShare: number;
  riskLevel: RiskLevel;
  contributorCount: number;
  fileCount: number;
};

export type ContributorRank = {
  contributorId: string;
  name: string;
  totalScore: number;
  commitCount: number;
  fileCount: number;
};

export type FileRisk = {
  filePath: string;
  topContributorName: string;
  topShare: number;
  riskLevel: RiskLevel;
  contributorCount: number;
};

type Bucket = {
  scoreByContributor: Map<string, { name: string; score: number }>;
  files: Set<string>;
};

function bucketBy(
  scores: ExpertiseScore[],
  keyOf: (s: ExpertiseScore) => string,
): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  for (const s of scores) {
    const key = keyOf(s);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { scoreByContributor: new Map(), files: new Set() };
      buckets.set(key, bucket);
    }
    const prev = bucket.scoreByContributor.get(s.contributorId);
    bucket.scoreByContributor.set(s.contributorId, {
      name: s.contributorName,
      score: (prev?.score ?? 0) + s.score,
    });
    bucket.files.add(s.filePath);
  }
  return buckets;
}

function topOf(bucket: Bucket): { name: string; share: number; count: number } {
  const entries = [...bucket.scoreByContributor.values()].sort((a, b) => b.score - a.score);
  const total = entries.reduce((sum, e) => sum + e.score, 0) || 1;
  const top = entries[0];
  return { name: top?.name ?? "—", share: (top?.score ?? 0) / total, count: entries.length };
}

const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

/** Per-subsystem concentration risk, computed from the expertise scores. */
export function subsystemRisks(scores: ExpertiseScore[]): SubsystemRisk[] {
  const buckets = bucketBy(scores, (s) => subsystemOf(s.filePath));
  const rows: SubsystemRisk[] = [...buckets.entries()].map(([subsystem, bucket]) => {
    const { name, share, count } = topOf(bucket);
    return {
      subsystem,
      topContributorName: name,
      topShare: share,
      riskLevel: riskLevel(share, count),
      contributorCount: count,
      fileCount: bucket.files.size,
    };
  });
  return rows.sort(
    (a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel] || b.fileCount - a.fileCount,
  );
}

/** Ranked contributors across the whole repo. */
export function contributorRanks(scores: ExpertiseScore[]): ContributorRank[] {
  const byId = new Map<string, ContributorRank>();
  for (const s of scores) {
    const prev = byId.get(s.contributorId);
    if (prev) {
      prev.totalScore += s.score;
      prev.commitCount += s.commitCount;
      prev.fileCount += 1;
    } else {
      byId.set(s.contributorId, {
        contributorId: s.contributorId,
        name: s.contributorName,
        totalScore: s.score,
        commitCount: s.commitCount,
        fileCount: 1,
      });
    }
  }
  return [...byId.values()].sort((a, b) => b.totalScore - a.totalScore);
}

/** Files whose knowledge is most concentrated (bus-factor risk), riskiest first. */
export function riskiestFiles(scores: ExpertiseScore[], limit = 8): FileRisk[] {
  const buckets = bucketBy(scores, (s) => s.filePath);
  const rows: FileRisk[] = [...buckets.entries()].map(([filePath, bucket]) => {
    const { name, share, count } = topOf(bucket);
    return {
      filePath,
      topContributorName: name,
      topShare: share,
      riskLevel: riskLevel(share, count),
      contributorCount: count,
    };
  });
  return rows
    .sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel] || b.topShare - a.topShare)
    .slice(0, limit);
}
