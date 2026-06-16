/**
 * Hargal ORS — test script
 * Run: node hargal-ws/test-call.js
 * Requires: HARGAL_USERNAME, HARGAL_PASSWORD in .env (or env vars)
 */

require('./load-env');
const { getUpdates, getWorkerState, isOnline } = require('./client');

const FACTORIES = [12, 14, 17, 18, 23, 25];
const SINCE = new Date('2024-01-01T00:00:00');

async function run() {
  console.log('=== Hargal ORS WS — Test ===\n');

  // 1. IsOnline
  console.log('1. בדיקת זמינות שירות (IsOnline)...');
  try {
    const ping = await isOnline();
    console.log(`   Status HTTP: ${ping.status}`);
    console.log(`   Online: ${ping.online}`);
  } catch (e) {
    console.log(`   ERROR: ${e.message}`);
  }

  // 2. Get_Updates for each factory
  console.log('\n2. שליפת עדכוני עובדים מכל מפעל (Get_Updates)...');
  for (const factory of FACTORIES) {
    console.log(`\n   מפעל ${factory}:`);
    try {
      const result = await getUpdates(factory, SINCE);
      console.log(`   HTTP Status: ${result.status}`);
      console.log(`   עובדים שהוחזרו: ${result.employees.length}`);
      if (result.employees.length > 0) {
        const first = result.employees[0];
        console.log('   דוגמת עובד ראשון:');
        console.log(`     מספר עובד: ${first.mispar_oved}`);
        console.log(`     שם: ${first.firstName} ${first.lastName}`);
        console.log(`     ת.ז: ${first.id}`);
        console.log(`     תחילת עבודה: ${first.employmentDate}`);
        console.log(`     מחלקה: ${first.machlaka}`);
        console.log(`     אימייל: ${first.email}`);
      }
      if (result.status !== 200) {
        console.log('   Raw XML (first 500):');
        console.log('  ', result.rawXml.substring(0, 500));
      }
    } catch (e) {
      console.log(`   ERROR: ${e.message}`);
    }
  }
}

run().catch(console.error);
