#!/usr/bin/env node

/**
 * Fetch Current Firestore Knowledge Base Data
 *
 * Fetches data from the currently active Firestore collection for comparison
 *
 * Usage: node scripts/fetchFirestoreData.cjs [dev|prod]
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Import Firebase (ESM style for compatibility)
async function main() {
  console.log('═'.repeat(80));
  console.log('📦 Firestore Data Fetcher');
  console.log('═'.repeat(80));

  // Dynamically import Firebase modules
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, collection, getDocs, doc, getDoc } = await import('firebase/firestore');
  const { getAuth, signInAnonymously } = await import('firebase/auth');

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "dimenotesv2.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dimenotesv2",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "dimenotesv2.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
  };

  console.log(`\n🔧 Firebase Config:`);
  console.log(`   Project ID: ${firebaseConfig.projectId}`);
  console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // Authenticate anonymously to access Firestore
  console.log('\n🔐 Authenticating...');
  try {
    const userCredential = await signInAnonymously(auth);
    console.log(`   ✓ Authenticated anonymously (UID: ${userCredential.user.uid})`);
  } catch (authError) {
    console.error('   ✗ Authentication failed:', authError.message);
    throw authError;
  }

  try {
    // Step 1: Get active dataset configuration
    console.log('\n📋 Checking active dataset configuration...');
    const configRef = doc(db, 'knowledgebase_config', 'active_dataset');
    const configDoc = await getDoc(configRef);

    let activeCollection = 'knowledgebase_wp'; // Default fallback
    if (configDoc.exists()) {
      const configData = configDoc.data();
      activeCollection = configData.collectionName || activeCollection;
      console.log(`   ✓ Active collection: ${activeCollection}`);
      console.log(`   ✓ Config data:`, JSON.stringify(configData, null, 2));
    } else {
      console.log(`   ⚠️  Config document not found, using default: ${activeCollection}`);
    }

    // Step 2: Fetch all documents from active collection
    console.log(`\n📥 Fetching documents from ${activeCollection}...`);
    const collectionRef = collection(db, activeCollection);
    const snapshot = await getDocs(collectionRef);

    const documents = [];
    snapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`   ✓ Fetched ${documents.length} documents`);

    // Step 3: Analyze document structure
    console.log('\n📊 Analyzing document structure...');
    if (documents.length > 0) {
      const sampleDoc = documents[0];
      console.log(`   Sample document ID: ${sampleDoc.id}`);
      console.log(`   Fields: ${Object.keys(sampleDoc).join(', ')}`);
      console.log(`   Content type: ${sampleDoc.contentType || 'N/A'}`);
      console.log(`   Has title: ${!!sampleDoc.title}`);
      console.log(`   Has content: ${!!sampleDoc.content}`);
      console.log(`   Has tags: ${!!sampleDoc.tags}`);
      console.log(`   Has group: ${!!sampleDoc.group}`);
    }

    // Step 4: Group by content type
    const byContentType = documents.reduce((acc, doc) => {
      const type = doc.contentType || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(doc);
      return acc;
    }, {});

    console.log(`\n📈 Content type breakdown:`);
    Object.entries(byContentType).forEach(([type, docs]) => {
      console.log(`   ${type}: ${docs.length} documents`);
    });

    // Step 5: Save to JSON files
    const OUTPUT_DIR = path.join(__dirname, 'firestore-data');
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];

    // Save all documents
    const allDocsFile = path.join(OUTPUT_DIR, `all-documents_${timestamp}.json`);
    fs.writeFileSync(allDocsFile, JSON.stringify(documents, null, 2));
    console.log(`\n💾 Saved all documents: all-documents_${timestamp}.json (${(fs.statSync(allDocsFile).size / 1024).toFixed(2)} KB)`);

    // Save metadata summary
    const summary = {
      fetchedAt: new Date().toISOString(),
      projectId: firebaseConfig.projectId,
      activeCollection: activeCollection,
      totalDocuments: documents.length,
      contentTypes: Object.entries(byContentType).map(([type, docs]) => ({
        type,
        count: docs.length
      })),
      sampleDocumentFields: documents.length > 0 ? Object.keys(documents[0]) : [],
      documentIds: documents.map(d => d.id).slice(0, 10) // First 10 IDs
    };

    const summaryFile = path.join(OUTPUT_DIR, `summary_${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`💾 Saved summary: summary_${timestamp}.json`);

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('✅ Fetch Complete!');
    console.log('═'.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Project:          ${firebaseConfig.projectId}`);
    console.log(`   Collection:       ${activeCollection}`);
    console.log(`   Total Documents:  ${documents.length}`);
    console.log(`   Output Directory: ${OUTPUT_DIR}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Review Firestore data in scripts/firestore-data/');
    console.log('   2. Compare with WordPress data in scripts/wordpress-data/');
    console.log('   3. Run comparison script to identify differences');
    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
