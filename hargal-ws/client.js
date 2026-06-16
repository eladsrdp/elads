/**
 * Hargal ORS SOAP Client
 * Operations: Get_Updates, Get_Worker_State, Send_New_Workers, Update_Workers, IsOnline
 * // SECURITY: credentials are read from env vars only — never hardcoded
 */

const https = require('https');
const http = require('http');

const WS_URL = process.env.HARGAL_WS_URL || 'https://hargal.ors.co.il/WS_ORS/HG_WEBSERVICE.SVC';

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

function parseXmlValue(xml, tagName) {
  const pattern = new RegExp(`<[^>]*:?${tagName}[^>]*>([^<]*)<`,'i');
  const match = xml.match(pattern);
  return match ? match[1].trim() : null;
}

function parseEmployees(xml) {
  const employees = [];
  // Split by employee record delimiter (adjust tag name after seeing real response)
  const recordPattern = /<[^>]*Worker_Data[^>]*>([\s\S]*?)<\/[^>]*Worker_Data[^>]*>/gi;
  let match;
  while ((match = recordPattern.exec(xml)) !== null) {
    const block = match[1];
    employees.push({
      mispar_oved:    parseXmlValue(block, 'Mispar_Oved') || parseXmlValue(block, 'MisparOved'),
      id:             parseXmlValue(block, 'id') || parseXmlValue(block, 'IDNumber'),
      firstName:      parseXmlValue(block, 'firstName') || parseXmlValue(block, 'FirstName'),
      lastName:       parseXmlValue(block, 'lastName') || parseXmlValue(block, 'LastName'),
      birthDate:      parseXmlValue(block, 'BirthDate'),
      gender:         parseXmlValue(block, 'Gender'),
      isForeignWorker:parseXmlValue(block, 'IsForeignWorker') || parseXmlValue(block, 'IsForeignCitizen'),
      countryOfOrigin:parseXmlValue(block, 'CountryOfOrigin') || parseXmlValue(block, 'Country'),
      email:          parseXmlValue(block, 'email') || parseXmlValue(block, 'Email'),
      mobile:         parseXmlValue(block, 'mobile') || parseXmlValue(block, 'Mobile'),
      tel:            parseXmlValue(block, 'tel'),
      street:         parseXmlValue(block, 'street') || parseXmlValue(block, 'Address'),
      houseNo:        parseXmlValue(block, 'houseNo') || parseXmlValue(block, 'Home_Number'),
      city:           parseXmlValue(block, 'city') || parseXmlValue(block, 'CityCode'),
      employmentDate: parseXmlValue(block, 'employmentDate') || parseXmlValue(block, 'StartWorkDate'),
      endDate:        parseXmlValue(block, 'EndDate'),
      machlaka:       parseXmlValue(block, 'Machlaka'),
      subDepartment:  parseXmlValue(block, 'SubDepartment') || parseXmlValue(block, 'Mishne'),
      subFactory:     parseXmlValue(block, 'SubFactory') || parseXmlValue(block, 'TatMifal'),
      roles:          parseXmlValue(block, 'Roles') || parseXmlValue(block, 'Tafkid'),
    });
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

  const result = await soapRequest(envelope, 'http://tempuri.org/IHG_WEBSERVICE/Get_Updates');
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

  const result = await soapRequest(envelope, 'http://tempuri.org/IHG_WEBSERVICE/Get_Worker_State');
  const employees = parseEmployees(result.body);
  return { status: result.status, rawXml: result.body, employee: employees[0] || null };
}

/**
 * Check if the service is online.
 */
async function isOnline() {
  const envelope = buildSoapEnvelope(`<tem:IsOnline/>`);
  const result = await soapRequest(envelope, 'http://tempuri.org/IHG_WEBSERVICE/IsOnline');
  const isTrue = result.body.includes('true') || result.body.includes('True');
  return { status: result.status, online: isTrue, rawXml: result.body };
}

module.exports = { getUpdates, getWorkerState, isOnline, parseEmployees };
