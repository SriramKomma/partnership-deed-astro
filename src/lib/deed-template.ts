/**
 * deed-template.ts
 * Renders the Partnership Deed HTML from Patnershipdeed.html template
 * by doing pure string/pattern-based replacement of dynamic data.
 * Legal text is NEVER modified.
 */

// No fs imports needed — template is built programmatically

// ─── Types (mirror DeedApp.tsx) ───────────────────────────────────────────────

export interface Partner {
  salutation: string; fullName: string; fatherName: string;
  age: string; address: string; panNumber: string;
  aadhaarNumberStored: boolean; panNumberStored: boolean;
  isManagingPartner: boolean; isBankAuthorized: boolean;
  capitalContribution: string; profitShare: string;
}

export interface DeedData {
  executionDate: string; businessName: string; natureOfBusiness: string;
  durationType: string; durationStartDate: string; registeredAddress: string;
  partners: Partner[]; businessObjective: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDINALS = [
  'First','Second','Third','Fourth','Fifth',
  'Sixth','Seventh','Eighth','Ninth','Tenth',
  'Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth',
];

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Partner section block (matches Patnershipdeed.html list-item style) ──────

function renderPartnerBlock(p: Partner, idx: number): string {
  const ordinal = ORDINALS[idx] || `${idx + 1}th`;
  const ordinalParty = `<b>${ordinal} party</b>`;
  return `
<ol start="${idx + 1}">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font face="Verdana, sans-serif"><b>${esc(p.fullName)}</b></font>
    <font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    ${esc(p.fatherName) ? `S/O ${esc(p.fatherName)}` : ''}
    Aged ${esc(p.age)} Years, residing at ${esc(p.address)}.
    </font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-left: 2in; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  (Hereinafter called as the "${ordinalParty}")
  </font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>`;
}

// ─── Capital contribution bullets ─────────────────────────────────────────────

function renderCapitalRows(partners: Partner[]): string {
  return partners.map((p, i) =>
    ` &bull; ${ORDINALS[i]} Party (${esc(p.fullName)}): ${esc(p.capitalContribution)}%<br/>`
  ).join('\n');
}

// ─── Profit sharing numbered list ─────────────────────────────────────────────

function renderProfitRows(partners: Partner[]): string {
  return partners.map((p, i) =>
    `<p lang="fr-CA" style="line-height: 100%; margin-left: 0.25in; margin-bottom: 0in">
      <font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt"><b>
      ${i + 1}. ${esc(p.fullName)} &nbsp;&nbsp;&nbsp; - ${esc(p.profitShare)}%
      </b></font></font>
     </p>`
  ).join('\n');
}

// ─── Managing partners text ────────────────────────────────────────────────────

function renderManagingPartners(partners: Partner[]): string {
  const mp = partners.filter(p => p.isManagingPartner);
  if (!mp.length) return partners.map(p => esc(p.fullName)).join(' &amp; ');
  return mp.map((p, i) => {
    const ordinal = ORDINALS[partners.indexOf(p)];
    return `<b>${ordinal} Part ${esc(p.fullName)}</b>`;
  }).join(' &amp; ');
}

// ─── Bank authorized partners text ────────────────────────────────────────────

function renderBankPartners(partners: Partner[]): string {
  const bp = partners.filter(p => p.isBankAuthorized);
  const effectiveBp = bp.length ? bp : partners;
  return effectiveBp.map((p, i) => {
    const origIdx = partners.indexOf(p);
    const ordinal = ORDINALS[origIdx];
    return `the Party of the "<b>${ordinal} Part," ${esc(p.fullName)}</b>`;
  }).join(', and ');
}

// ─── Witness / signature rows ──────────────────────────────────────────────────

function renderWitnessRows(partners: Partner[]): string {
  return partners.map((p, i) =>
    `<p lang="fr-CA" style="line-height: 100%; margin-bottom: 0in">
      <font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
      ${i + 1}. Witness &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${i + 1}. ${esc(p.fullName)}
      </font></font>
     </p>
     <p lang="fr-CA" style="line-height: 100%; margin-bottom: 0in"><br/></p>
     <p lang="fr-CA" style="line-height: 100%; margin-bottom: 0in"><br/></p>`
  ).join('\n');
}

// ─── Main render function ──────────────────────────────────────────────────────

export function renderDeed(data: DeedData): string {
  const {
    executionDate, businessName, natureOfBusiness, durationType,
    durationStartDate, registeredAddress, partners, businessObjective,
  } = data;

  const partnerBlocks  = partners.map((p, i) => renderPartnerBlock(p, i)).join('\n');
  const capitalRows    = renderCapitalRows(partners);
  const profitRows     = renderProfitRows(partners);
  const managingText   = renderManagingPartners(partners);
  const bankText       = renderBankPartners(partners);
  const witnessRows    = renderWitnessRows(partners);

  const durationClause = durationType === 'AT WILL'
    ? 'The duration of the firm shall be at WILL of the partners.'
    : `The partnership firm shall come into existence from <b>${esc(durationStartDate)}</b>.`;

  // HTML comments from the original file stripped, pure legal text kept.
  return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8"/>
  <title>PARTNERSHIP DEED — M/s. ${esc(businessName)}</title>
  <style type="text/css">
    /* ── Print / PDF (Puppeteer) ── */
    @page { size: A4; margin: 25.4mm 25.4mm 25.4mm 25.4mm; }

    /* ── Screen: grey background, centred A4 paper card ── */
    html, body {
      margin: 0; padding: 0;
      background: #b0b0b0;
      font-family: Verdana, sans-serif;
      font-size: 11pt;
      color: #000;
    }
    .a4-page {
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      background: #fff;
      padding: 25.4mm;
      box-sizing: border-box;
      box-shadow: 0 4px 32px rgba(0,0,0,0.30);
    }
    p { line-height: 115%; text-align: left; orphans: 2; widows: 2; margin-bottom: 0.1in; }
    @media print {
      html, body { background: #fff; }
      .a4-page { box-shadow: none; margin: 0; padding: 0; width: 100%; }
      .no-print { display: none !important; }
    }
    .disclaimer {
      margin-top: 2em;
      padding: 0.5em 1em;
      background: #fff8e1;
      border-left: 4px solid #f9a825;
      font-size: 9pt;
      color: #555;
    }
  </style>
</head>
<body lang="en-IN" dir="ltr">
<div class="a4-page">

<!-- ── TITLE ── -->
<p lang="en-US" align="center" style="line-height: 100%; margin-bottom: 0in; margin-top: 0">
  <u><b><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">PARTNERSHIP DEED</font></font></b></u>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── OPENING PARA ── -->
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  This Deed of Partnership is made and executed on the <b>${esc(executionDate)}</b>, by and between:
  </font></font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── PARTNER BLOCKS (N partners) ── -->
${partnerBlocks}

<!-- ── WHEREAS ── -->
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  WHEREAS the parties here have mutually decided to start a partnership business of
  <b>${esc(natureOfBusiness)}</b> under the name and style as
  <font color="#000000"><b>M/s. ${esc(businessName)}.</b></font>
  </font></font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  AND WHEREAS it is felt expedient to reduce the terms and conditions agreed upon by the above said
  continuing partners into writing to avoid any misunderstandings amongst the partners at a future date.
  </font></font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  <u>NOW THIS DEED OF PARTNERSHIP WITNESSETH AS FOLLOWS:</u>
  </font></font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 1: FIRM NAME + COMMENCEMENT ── -->
<ol>
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The partnership business shall be carried on under the name and style as
    <font color="#000000"><b>M/s. ${esc(businessName)}.</b></font>
    The partnership firm shall come into existence with effect from <b>${esc(durationStartDate || executionDate)}</b>.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-left: 0.25in; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif">
  ${durationClause}
  </font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 2: PRINCIPAL PLACE OF BUSINESS ── -->
<ol start="2">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The <b>Principal place of business</b> of the firm shall be at
    <b>${esc(registeredAddress)}</b>.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 3: BUSINESS OBJECTIVE ── -->
<ol start="3">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The <b>objective of partnership</b> is to carry on the following business:
    </font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>
<ol><ol type="a">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    ${esc(businessObjective)}
    </font></font>
  </p></li>
</ol></ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 4: CAPITAL CONTRIBUTION ── -->
<ol start="4">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    <b>Capital Contribution of the Partners:</b><br/><br/>
    </font></font></font></font>
  </p></li>
</ol>
<p lang="fr-CA" style="line-height: 125%; margin-left: 0.25in; margin-bottom: 0in">
  <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  The total capital contribution of the partners in the firm shall be in the following proportions:<br/>
  ${capitalRows}
  </font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 5: MANAGING PARTNERS ── -->
<ol start="5">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The parties of the ${managingText} shall be the <b>managing partner's</b>
    and is authorized and empowered to do the following acts, deeds and things on behalf of the firm:
    </font></font></font></font>
  </p></li>
</ol>
<p lang="fr-CA" style="line-height: 100%; margin-left: 0.5in; margin-bottom: 0in"><br/></p>
<ol type="a"><ol type="a">
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To manage the business of the partnership firm with a power to appoint remuneration, etc. They shall
    also have the power to dispense with the service of such personnel that are not required.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To negotiate any business transactions and enter into agreements on behalf of the firm and to enter
    into all/any contracts and sub-contracts on either way. To enter to the sale and purchase agreements
    relating to the objective of the business.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To enter into correspondence with government departments, quasi-govt departments, public and private
    organizations, individuals, etc regarding the partnership business.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To incur all expenses necessary for the conduct of the business.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To borrow moneys against credit of partnership, if necessary by hypothecating or creating a charge
    upon the assets of the partnership.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To be in custody of all account books, documents, negotiable instruments and all other documents
    pertaining to the business.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To look after the proper upkeep of books of accounts required for the business and to supervise the
    same at regular intervals.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To open bank account/accounts in the name of the partnership firm.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To put all the monies, cheques etc., which are not immediately required for the conduct of the business
    into the bank account, opened for the Partnership business.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    To do all other acts and things that are necessary for carrying on the business.
    </font></font></font></p></li>
  <li><p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The managing partner's are empowered to borrow money as and when found necessary for the business
    from any nationalized or schedule bank/banks or any other financial institutions from time to time
    and execute necessary actions at all the times.
    </font></font></font></p></li>
</ol></ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 6: BANK ACCOUNT OPERATIONS ── -->
<ol start="6">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The firm shall maintain one or more banking accounts (e.g., current accounts, overdrafts, cash credit,
    etc.) as may be decided by the partners from time to time. The said bank accounts shall be operated
    jointly by ${bankText}.
    The signatures of all authorized partners shall be jointly required for the issuance and authorization
    of cheques or any other banking transactions. No transaction shall be deemed valid unless signed by
    all authorized partners.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 7 ── -->
<ol start="7">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The partners, upon mutual consent of all the partners of this partnership deed appoint any another
    individual as the authorized signatory for entering into the agreements relating to sale and purchase
    of the land or/and building.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 8: REMUNERATION ── -->
<ol start="8">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font color="#000000"><font size="3" style="font-size: 12pt"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    That all the partners shall be working partners of the firm and shall be bound to devote full time and
    attention to the partnership business and shall be actively engaged in conducting the affairs of the
    firm and therefore it has been agreed to pay salary/remuneration for the services rendered as per the
    provisions under section 40(b) of the income tax Act, 1961.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="fr-CA" align="justify" style="line-height: 100%; margin-left: 0.25in; margin-bottom: 0in">
  <font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  For the purpose of above calculation of the remuneration shall be on the basis of profit as shown by the
  books and computed as provided in section 20 to 44 D of chapter IV of the income Tax Act, 1961 as
  increased by the aggregate of remuneration paid or payable to the partners of the firm if such
  remuneration has been deducted while computing the net profit.
  </font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-left: 0.25in; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  That the interest at the rate of 12% per annum or as may be prescribed u/s.40(b)(iv) of the Income Tax
  Act, 1961 or may be any other applicable provisions as may be in force in the Income tax assessment of
  partnership firm for the relevant accounting year shall be payable to the partners on the amount standing
  to the credit of the account of the partners. Such interest shall be calculated and credited to the account
  of each partner at the close of the accounting year.
  </font></font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 9: BOOKS OF ACCOUNTS ── -->
<ol start="9">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The books of accounts of the partnership shall be maintained at the principal place of business and
    the same shall be closed on the 31st of march every year to arrive at the profit or loss for the period
    ending and to draw the profit and loss account and the balance sheet to know the financial position of
    the firm as on date.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 10: PROFIT / LOSS SHARING ── -->
<ol start="10">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    That the share of the profits or losses of partnership business after taking into account all business
    and incidental expenses will be as follows:
    </font></font></font></font>
  </p></li>
</ol>
<p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>
${profitRows}
<p lang="fr-CA" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 11: RETIREMENT ── -->
<ol start="11">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    Any partner desirous of retiring from the partnership during its continuance can exercise his / her
    right by giving three calendar months' notice to the other partner.
    </font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 12: DISSOLUTION ── -->
<ol start="12">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    Death, retirement or insolvency of any of the partners shall not to dissolve the partnership. Further
    in case of death of any of the partners of the firm, the legal heirs as the case may be, shall be
    entitled to the capital account balance with the share of profit or loss up to the date of death of
    the partner only. The goodwill of the partnership business shall not be valued in the above circumstances.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 13: ARBITRATION ── -->
<ol start="13">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    Any dispute that may arise between the partners shall be referred to an arbitrator whose award shall
    be final and binding on the parties <b>MUTTATIS MUTANDIS</b>.
    The appointment of the arbitrator shall be on mutual consent.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 14: PARTNERSHIP ACT ── -->
<ol start="14">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    The provision of the partnership Act 1932 as in vogue time to time shall apply to this partnership
    except as otherwise stated above.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>

<!-- ── CLAUSE 15: AMENDMENT ── -->
<ol start="15">
  <li><p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
    <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
    Any of the terms of this Deed may be amended, abandoned or otherwise be dealt with according to the
    necessities of the business and convenience of the partners and they shall be reduced to writing on
    Rs. 100/- stamp paper which shall have the same effect as if embodied in this Deed.
    </font></font></font></font>
  </p></li>
</ol>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/><br/><br/></p>

<!-- ── IN WITNESS WHEREOF ── -->
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000"><font face="Verdana, sans-serif"><font size="2" style="font-size: 11pt">
  IN WITNESS WHEREOF the parties hereto have set hands on this the <b>${esc(executionDate)}</b>.
  </font></font></font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/><br/></p>

<!-- ── SIGNATURES ── -->
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in">
  <font size="3" style="font-size: 12pt"><font color="#000000">
  <font face="Verdana, sans-serif"><u>WITNESSES</u></font>
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <font face="Verdana, sans-serif"><u>Partners</u></font>
  </font></font>
</p>
<p lang="en-US" align="justify" style="line-height: 100%; margin-bottom: 0in"><br/></p>
${witnessRows}

<!-- ── DISCLAIMER ── -->
<div class="disclaimer no-print">
  <b>Disclaimer:</b> This document is generated based on user input and must be reviewed by
  a qualified legal professional before execution.
</div>

</div><!-- /.a4-page -->
</body>
</html>`;
}
