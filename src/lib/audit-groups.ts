export function storyRows<T>(stories: T[], size = 6): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < stories.length; index += size) rows.push(stories.slice(index, index + size));
  return rows;
}

export function auditsOfType<T extends { auditType: string }>(audits: T[], auditType: string): T[] {
  return audits.filter((audit) => audit.auditType === auditType);
}

export function auditsInRegion<T extends { region: string }>(audits: T[], region: string): T[] {
  return audits.filter((audit) => audit.region === region);
}

export function splitAuditLead<T extends { id: string; featured: boolean }>(
  audits: T[],
): { lead?: T; secondary: T[] } {
  const featured = audits.find((audit) => audit.featured);
  const lead = featured ?? audits[0];
  return {
    lead,
    secondary: audits.filter((audit) => audit.id !== lead?.id).slice(0, 4),
  };
}

export function relatedAudits<T extends { id: string; region: string; auditType: string }>(
  current: T,
  audits: T[],
  limit = 6,
): T[] {
  const others = audits.filter((audit) => audit.id !== current.id);
  const sameRegion = others.filter((audit) => audit.region === current.region);
  const sameType = others.filter(
    (audit) => audit.auditType === current.auditType && audit.region !== current.region,
  );
  const used = new Set([...sameRegion, ...sameType].map((audit) => audit.id));
  const rest = others.filter((audit) => !used.has(audit.id));
  return [...sameRegion, ...sameType, ...rest].slice(0, limit);
}

export function groupedAudits<T extends { auditType: string }>(
  audits: T[],
  types: readonly { auditType: string }[],
  limit?: number,
): { auditType: string; stories: T[] }[] {
  return types
    .map((type) => {
      const matches = audits.filter((audit) => audit.auditType === type.auditType);
      return { auditType: type.auditType, stories: limit === undefined ? matches : matches.slice(0, limit) };
    })
    .filter((group) => group.stories.length > 0);
}
