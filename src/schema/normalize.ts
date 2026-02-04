import type { BlockInfo, CardHeader, CardSummary } from '../types.js';

export function normalizeCard(
  header: CardHeader,
  blockIndex: BlockInfo[],
  blocks: Record<string, any>,
): CardSummary {
  const product = header.header;
  const blockNames = blockIndex.map((b) => b.name);

  const summary: CardSummary = {
    header,
    product,
    blocks: blockNames,
  };

  const param = blocks.Parameter;
  if (param) {
    const lastname = param.lastname ?? param.lastName ?? '';
    const firstname = param.firstname ?? param.firstName ?? '';
    const name = `${lastname} ${firstname}`.trim();
    if (name) summary.name = name;

    const birthMonth = param.birthMonth ?? param.birthday?.month;
    const birthDay = param.birthDay ?? param.birthday?.day;
    if (birthMonth !== undefined || birthDay !== undefined) {
      summary.birthday = {
        month: birthMonth,
        day: birthDay,
      };
    }

    if (param.sex !== undefined) {
      summary.sex = param.sex;
    }
  }

  summary.hasKKEx = blockNames.includes('KKEx');

  return summary;
}
