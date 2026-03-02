import type { APIRoute } from 'astro';
import type { DeedData } from '../../lib/deed-template';
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, UnderlineType,
  convertInchesToTwip, LevelFormat,
} from 'docx';

const ORDINALS = [
  'First','Second','Third','Fourth','Fifth',
  'Sixth','Seventh','Eighth','Ninth','Tenth',
  'Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth',
];

// ─── Style helpers ────────────────────────────────────────────────────────────

const FONT  = 'Verdana';
const PT    = (pt: number) => pt * 20; // half-points (OOXML)
const INCH  = convertInchesToTwip;

function run(text: string, opts: {
  bold?: boolean; underline?: boolean; size?: number;
} = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: PT(opts.size ?? 11),
    bold: opts.bold,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function para(
  runs: TextRun | TextRun[],
  opts: { align?: typeof AlignmentType[keyof typeof AlignmentType]; indent?: number; spacing?: number } = {}
): Paragraph {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    indent: opts.indent ? { left: INCH(opts.indent) } : undefined,
    spacing: { after: PT(opts.spacing ?? 6) },
    children: Array.isArray(runs) ? runs : [runs],
  });
}

function blank(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: '' })] });
}

// ─── Document builder ─────────────────────────────────────────────────────────

function buildDoc(data: DeedData): Document {
  const {
    executionDate, businessName, natureOfBusiness, durationType,
    durationStartDate, registeredAddress, partners, businessObjective,
  } = data;

  const children: Paragraph[] = [];

  // ── TITLE ──
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: PT(12) },
      children: [
        new TextRun({
          text: 'PARTNERSHIP DEED',
          font: FONT, bold: true, size: PT(11),
          underline: { type: UnderlineType.SINGLE },
        }),
      ],
    }),
    blank(),
  );

  // ── OPENING PARAGRAPH ──
  children.push(
    para([
      run('This Deed of Partnership is made and executed on the '),
      run(executionDate, { bold: true }),
      run(', by and between:'),
    ]),
    blank(),
  );

  // ── PARTNERS ──
  partners.forEach((p, i) => {
    const ordinal = ORDINALS[i] ?? `${i + 1}th`;
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        numbering: { reference: 'partnerList', level: 0 },
        spacing: { after: PT(6) },
        children: [
          run(p.fullName, { bold: true }),
          run(p.fatherName ? ` S/O ${p.fatherName}` : ''),
          run(` Aged ${p.age} Years, residing at ${p.address}.`),
        ],
      }),
      para([
        run(`(Hereinafter called as the "`),
        run(`${ordinal} party`, { bold: true }),
        run(`")`),
      ], { indent: 2 }),
      blank(),
    );
  });

  // ── WHEREAS ──
  children.push(
    para([
      run('WHEREAS the parties here have mutually decided to start a partnership business of '),
      run(natureOfBusiness, { bold: true }),
      run(' under the name and style as '),
      run(`M/s. ${businessName}.`, { bold: true }),
    ]),
    blank(),
    para([run('AND WHEREAS it is felt expedient to reduce the terms and conditions agreed upon by the above said continuing partners into writing to avoid any misunderstandings amongst the partners at a future date.')]),
    blank(),
    para([run('NOW THIS DEED OF PARTNERSHIP WITNESSETH AS FOLLOWS:', { underline: true })]),
    blank(),
  );

  // ── CLAUSE 1 ──
  children.push(
    new Paragraph({
      numbering: { reference: 'clauseList', level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PT(6) },
      children: [
        run('The partnership business shall be carried on under the name and style as '),
        run(`M/s. ${businessName}.`, { bold: true }),
        run(' The partnership firm shall come into existence with effect from '),
        run(durationStartDate || executionDate, { bold: true }),
        run('.'),
      ],
    }),
    para([
      run(durationType === 'AT WILL'
        ? 'The duration of the firm shall be at WILL of the partners.'
        : `The partnership firm shall come into existence from ${durationStartDate}.`
      ),
    ], { indent: 0.25 }),
    blank(),
  );

  // ── CLAUSE 2 ──
  children.push(
    new Paragraph({
      numbering: { reference: 'clauseList', level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PT(6) },
      children: [
        run('The '),
        run('Principal place of business', { bold: true }),
        run(' of the firm shall be at '),
        run(registeredAddress, { bold: true }),
        run('.'),
      ],
    }),
    blank(),
  );

  // ── CLAUSE 3 ──
  children.push(
    new Paragraph({
      numbering: { reference: 'clauseList', level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PT(6) },
      children: [
        run('The '),
        run('objective of partnership', { bold: true }),
        run(' is to carry on the following business:'),
      ],
    }),
    blank(),
    new Paragraph({
      numbering: { reference: 'subClauseList', level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PT(6) },
      children: [run(businessObjective)],
    }),
    blank(),
  );

  // ── CLAUSE 4: CAPITAL ──
  children.push(
    new Paragraph({
      numbering: { reference: 'clauseList', level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PT(6) },
      children: [run('Capital Contribution of the Partners:', { bold: true })],
    }),
    para([run('The total capital contribution of the partners in the firm shall be in the following proportions:')], { indent: 0.25 }),
  );
  partners.forEach((p, i) => {
    children.push(
      para([
        run(`\u2022 ${ORDINALS[i]} Party (${p.fullName}): ${p.capitalContribution}%`),
      ], { indent: 0.5 }),
    );
  });
  children.push(blank());

  // ── CLAUSE 5: MANAGING PARTNERS ──
  const managingPartners = partners.filter(p => p.isManagingPartner);
  const effectiveMp = managingPartners.length ? managingPartners : partners;
  const mpText = effectiveMp.map((p, idx) => {
    const origIdx = partners.indexOf(p);
    return `${ORDINALS[origIdx]} Part ${p.fullName}`;
  }).join(' & ');

  children.push(
    new Paragraph({
      numbering: { reference: 'clauseList', level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PT(6) },
      children: [
        run(`The parties of the ${mpText} shall be the `),
        run(`managing partner's`, { bold: true }),
        run(' and is authorized and empowered to do the following acts, deeds and things on behalf of the firm:'),
      ],
    }),
    blank(),
  );

  const managingPowers = [
    'To manage the business of the partnership firm with a power to appoint remuneration, etc. They shall also have the power to dispense with the service of such personnel that are not required.',
    'To negotiate any business transactions and enter into agreements on behalf of the firm and to enter into all/any contracts and sub-contracts on either way. To enter to the sale and purchase agreements relating to the objective of the business.',
    'To enter into correspondence with government departments, quasi-govt departments, public and private organizations, individuals, etc regarding the partnership business.',
    'To incur all expenses necessary for the conduct of the business.',
    'To borrow moneys against credit of partnership, if necessary by hypothecating or creating a charge upon the assets of the partnership.',
    'To be in custody of all account books, documents, negotiable instruments and all other documents pertaining to the business.',
    'To look after the proper upkeep of books of accounts required for the business and to supervise the same at regular intervals.',
    'To open bank account/accounts in the name of the partnership firm.',
    'To put all the monies, cheques etc., which are not immediately required for the conduct of the business into the bank account, opened for the Partnership business.',
    'To do all other acts and things that are necessary for carrying on the business.',
    'The managing partner\'s are empowered to borrow money as and when found necessary for the business from any nationalized or schedule bank/banks or any other financial institutions from time to time and execute necessary actions at all the times.',
  ];
  managingPowers.forEach(text => {
    children.push(
      new Paragraph({
        numbering: { reference: 'subClauseList', level: 0 },
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: PT(4) },
        children: [run(text)],
      }),
    );
  });
  children.push(blank());

  // ── CLAUSE 6: BANK ACCOUNTS ──
  const bankPartners = partners.filter(p => p.isBankAuthorized);
  const effectiveBp = bankPartners.length ? bankPartners : partners;
  const bpText = effectiveBp.map((p) => `${ORDINALS[partners.indexOf(p)]} Part ${p.fullName}`).join(', and ');

  children.push(
    new Paragraph({
      numbering: { reference: 'clauseList', level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: PT(6) },
      children: [
        run(`The firm shall maintain one or more banking accounts (e.g., current accounts, overdrafts, cash credit, etc.) as may be decided by the partners from time to time. The said bank accounts shall be operated jointly by ${bpText}. The signatures of all authorized partners shall be jointly required for the issuance and authorization of cheques or any other banking transactions. No transaction shall be deemed valid unless signed by all authorized partners.`),
      ],
    }),
    blank(),
  );

  // ── CLAUSES 7-15 (static) ──
  const staticClauses: string[] = [
    'The partners, upon mutual consent of all the partners of this partnership deed appoint any another individual as the authorized signatory for entering into the agreements relating to sale and purchase of the land or/and building.',
    'That all the partners shall be working partners of the firm and shall be bound to devote full time and attention to the partnership business and shall be actively engaged in conducting the affairs of the firm and therefore it has been agreed to pay salary/remuneration for the services rendered as per the provisions under section 40(b) of the income tax Act, 1961.\n\nFor the purpose of above calculation of the remuneration shall be on the basis of profit as shown by the books and computed as provided in section 20 to 44 D of chapter IV of the income Tax Act, 1961 as increased by the aggregate of remuneration paid or payable to the partners of the firm if such remuneration has been deducted while computing the net profit.\n\nThat the interest at the rate of 12% per annum or as may be prescribed u/s.40(b)(iv) of the Income Tax Act, 1961 or may be any other applicable provisions as may be in force in the Income tax assessment of partnership firm for the relevant accounting year shall be payable to the partners on the amount standing to the credit of the account of the partners. Such interest shall be calculated and credited to the account of each partner at the close of the accounting year.',
    'The books of accounts of the partnership shall be maintained at the principal place of business and the same shall be closed on the 31st of march every year to arrive at the profit or loss for the period ending and to draw the profit and loss account and the balance sheet to know the financial position of the firm as on date.',
    'That the share of the profits or losses of partnership business after taking into account all business and incidental expenses will be as follows:',
    'Any partner desirous of retiring from the partnership during its continuance can exercise his / her right by giving three calendar months\u2019 notice to the other partner.',
    'Death, retirement or insolvency of any of the partners shall not to dissolve the partnership. Further in case of death of any of the partners of the firm, the legal heirs as the case may be, shall be entitled to the capital account balance with the share of profit or loss up to the date of death of the partner only. The goodwill of the partnership business shall not be valued in the above circumstances.',
    'Any dispute that may arise between the partners shall be referred to an arbitrator whose award shall be final and binding on the parties MUTTATIS MUTANDIS. The appointment of the arbitrator shall be on mutual consent.',
    'The provision of the partnership Act 1932 as in vogue time to time shall apply to this partnership except as otherwise stated above.',
    'Any of the terms of this Deed may be amended, abandoned or otherwise be dealt with according to the necessities of the business and convenience of the partners and they shall be reduced to writing on Rs. 100/- stamp paper which shall have the same effect as if embodied in this Deed.',
  ];

  staticClauses.forEach((text, idx) => {
    const clauseNum = idx + 7;
    // Clause 10 (profit sharing): inject profit rows after main text
    if (clauseNum === 10) {
      children.push(
        new Paragraph({
          numbering: { reference: 'clauseList', level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: PT(6) },
          children: [run(text)],
        }),
        blank(),
      );
      partners.forEach((p, pi) => {
        children.push(
          para([
            run(`${pi + 1}. ${p.fullName}  —  ${p.profitShare}%`, { bold: true }),
          ], { indent: 0.25 }),
        );
      });
      children.push(blank());
    } else {
      // Multi-paragraph clauses (clause 8)
      const parts = text.split('\n\n');
      children.push(
        new Paragraph({
          numbering: { reference: 'clauseList', level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: PT(6) },
          children: [run(parts[0])],
        }),
      );
      parts.slice(1).forEach(part => {
        children.push(para([run(part)], { indent: 0.25 }));
      });
      children.push(blank());
    }
  });

  // ── IN WITNESS WHEREOF ──
  children.push(
    blank(),
    para([
      run('IN WITNESS WHEREOF the parties hereto have set hands on this the '),
      run(executionDate, { bold: true }),
      run('.'),
    ]),
    blank(), blank(),
  );

  // ── SIGNATURES ──
  children.push(
    para([
      run('WITNESSES', { underline: true }),
      run('\t\t\t\t\t\t\t\t'),
      run('Partners', { underline: true }),
    ]),
    blank(),
  );
  partners.forEach((p, i) => {
    children.push(
      para([
        run(`${i + 1}. ____________________`),
        run('\t\t\t\t\t\t'),
        run(`${i + 1}. ${p.fullName}`),
      ]),
      blank(), blank(),
    );
  });

  // ── DISCLAIMER ──
  children.push(
    blank(),
    new Paragraph({
      border: { left: { color: 'F9A825', size: 12, space: 6, style: 'single' } },
      spacing: { before: PT(12), after: PT(6) },
      shading: { fill: 'FFF8E1' },
      children: [
        new TextRun({
          text: 'Disclaimer: This document is generated based on user input and must be reviewed by a qualified legal professional before execution.',
          font: FONT, size: PT(9), color: '555555',
          bold: true,
        }),
      ],
    }),
  );

  return new Document({
    numbering: {
      config: [
        {
          reference: 'partnerList',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: INCH(0.5), hanging: INCH(0.25) } } },
          }],
        },
        {
          reference: 'clauseList',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            start: 1,
            style: { paragraph: { indent: { left: INCH(0.5), hanging: INCH(0.25) } } },
          }],
        },
        {
          reference: 'subClauseList',
          levels: [{
            level: 0,
            format: LevelFormat.LOWER_LETTER,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: INCH(0.75), hanging: INCH(0.25) } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },   // A4 in twips
          margin: { top: INCH(1), right: INCH(1), bottom: INCH(1), left: INCH(1) },
        },
      },
      children,
    }],
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const { deedData } = await request.json() as { deedData: DeedData };
    if (!deedData) {
      return new Response(JSON.stringify({ error: 'Missing deedData' }), { status: 400 });
    }

    const doc = buildDoc(deedData);
    const docxBuffer = await Packer.toBuffer(doc);
    const firmName = (deedData.businessName || 'Partnership_Deed').replace(/[^a-z0-9]/gi, '_');

    return new Response(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Deed_${firmName}.docx"`,
      },
    });
  } catch (err: any) {
    console.error('[download-docx]', err?.message, err?.stack);
    return new Response(JSON.stringify({ error: err?.message }), { status: 500 });
  }
};
