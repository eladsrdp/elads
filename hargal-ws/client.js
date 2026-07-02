/**
 * Hargal ORS SOAP Client
 * Operations: Get_Updates, Get_Worker_State, Send_New_Workers, Update_Workers, IsOnline
 * // SECURITY: credentials are read from env vars only — never hardcoded
 */

const https = require('https');
const http = require('http');

const WS_URL = process.env.HARGAL_WS_URL || 'https://hargal.ors.co.il/WS_ORS/HG_WebService.svc';

function buildSoapEnvelope(bodyXml) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:tem="http://tempuri.org/"
  xmlns:har="http://schemas.datacontract.org/2004/07/Hargal_Sachar_WS">
  <soapenv:Header/>
  <soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;
}

function soapRequest(envelope, soapAction) {
  return new Promise((resolve, reject) => {
    const url = new URL(WS_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const body = Buffer.from(envelope, 'utf-8');

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${soapAction}"`,
        'Content-Length': body.length,
      },
      timeout: 30000,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.write(body);
    req.end();
  });
}

function parseEmployees(xml) {
  const employees = [];
  // Real response: Worker_Details > Data > Data_Pair[] with Name/Value children
  const workerPattern = /<[^:>]*:?Worker_Details[^>]*>([\s\S]*?)<\/[^:>]*:?Worker_Details[^>]*>/gi;
  let workerMatch;

  while ((workerMatch = workerPattern.exec(xml)) !== null) {
    const block = workerMatch[1];
    const record = {};

    const pairPattern = /<[^:>]*:?Data_Pair[^>]*>([\s\S]*?)<\/[^:>]*:?Data_Pair[^>]*>/gi;
    let pairMatch;

    while ((pairMatch = pairPattern.exec(block)) !== null) {
      const pair = pairMatch[1];
      const nameMatch = pair.match(/<[^:>]*:?Name[^>]*>([^<]+)<\//i);
      if (!nameMatch) continue;
      const fieldName = nameMatch[1].trim();

      // <a:Value i:nil="true"/> → null; <a:Value>text</a:Value> → text
      const isNil = /<[^:>]*:?Value[^>]+i:nil="true"/i.test(pair);
      if (isNil) {
        record[fieldName] = null;
      } else {
        const valueMatch = pair.match(/<[^:>]*:?Value[^>]*>([^<]*)<\//i);
        record[fieldName] = valueMatch ? valueMatch[1].trim() || null : null;
      }
    }

    if (record.Mispar_Oved !== undefined) {
      employees.push(record);
    }
  }

  return employees;
}

/**
 * Get employees updated since a given date for a specific factory.
 * @param {number} kodMifal - Factory code (e.g. 12, 14, 17, 18, 23, 25)
 * @param {Date} sinceDate - Fetch changes from this datetime
 */
async function getUpdates(kodMifal, sinceDate = new Date('2020-01-01')) {
  const username = process.env.HARGAL_USERNAME;
  const password = process.env.HARGAL_PASSWORD;
  if (!username || !password) {
    throw new Error('Missing HARGAL_USERNAME or HARGAL_PASSWORD environment variables');
  }

  const dateStr = sinceDate.toISOString().replace('Z', '');
  const envelope = buildSoapEnvelope(`
    <tem:Get_Updates>
      <tem:request>
        <har:KodMifal>${kodMifal}</har:KodMifal>
        <har:Password>${password}</har:Password>
        <har:RequestDate>${dateStr}</har:RequestDate>
        <har:Username>${username}</har:Username>
      </tem:request>
    </tem:Get_Updates>`);

  const result = await soapRequest(envelope, 'http://tempuri.org/IHG_WebService/Get_Updates');
  return { status: result.status, rawXml: result.body, employees: parseEmployees(result.body) };
}

/**
 * Get a single worker's state by factory + one of: mispar_oved / id_number / passport
 */
async function getWorkerState({ kodMifal, misparOved, idNumber, passport }) {
  const username = process.env.HARGAL_USERNAME;
  const password = process.env.HARGAL_PASSWORD;
  if (!username || !password) {
    throw new Error('Missing HARGAL_USERNAME or HARGAL_PASSWORD environment variables');
  }

  const envelope = buildSoapEnvelope(`
    <tem:Get_Worker_State>
      <tem:worker>
        <har:MisparMifal>${kodMifal}</har:MisparMifal>
        <har:Password>${password}</har:Password>
        <har:Username>${username}</har:Username>
        ${misparOved ? `<har:MisparOved>${misparOved}</har:MisparOved>` : ''}
        ${idNumber    ? `<har:IDNumber>${idNumber}</har:IDNumber>` : ''}
        ${passport    ? `<har:Passport>${passport}</har:Passport>` : ''}
      </tem:worker>
    </tem:Get_Worker_State>`);

  const result = await soapRequest(envelope, 'http://tempuri.org/IHG_WebService/Get_Worker_State');
  const employees = parseEmployees(result.body);
  return { status: result.status, rawXml: result.body, employee: employees[0] || null };
}

/**
 * Check if the service is online.
 */
async function isOnline() {
  const envelope = buildSoapEnvelope(`<tem:IsOnline/>`);
  const result = await soapRequest(envelope, 'http://tempuri.org/IHG_WebService/IsOnline');
  const isTrue = result.body.includes('true') || result.body.includes('True');
  return { status: result.status, online: isTrue, rawXml: result.body };
}

module.exports = { getUpdates, getWorkerState, isOnline, parseEmployees };
