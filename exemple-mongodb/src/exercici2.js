const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const PDFDocument = require('pdfkit');
require('dotenv').config();

// Conexion a MongoDB
const uri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/';
const client = new MongoClient(uri);

async function generatePDF(filePath, titles) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(16).text('Resultats de la consulta', { align: 'center' });
  doc.moveDown();

  titles.forEach((title, index) => {
    doc.fontSize(12).text(`${index + 1}. ${title}`);
  });

  doc.end();
}

async function main() {
  try {
    await client.connect();
    console.log('Connectat a MongoDB');

    const database = client.db('questions_db');
    const collection = database.collection('questions');

    // ViewCount major a la mitjana
    const avgViewCount = await collection.aggregate([
      { $group: { _id: null, avgViewCount: { $avg: '$question.ViewCount' } } }
    ]).toArray();

    const average = avgViewCount[0]?.avgViewCount || 0;
    const query1Results = await collection.find({ 'question.ViewCount': { $gt: average } }).toArray();
    console.log(`Consulta 1: ${query1Results.length} resultats trobats`);

    const titlesQuery1 = query1Results.map(doc => doc.question.Title);

    // Generar informe1.pdf
    const outputDir = path.join(__dirname, '../../data/out');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath1 = path.join(outputDir, 'informe1.pdf');
    await generatePDF(filePath1, titlesQuery1);
    console.log('informe1.pdf generat correctament');

    // Coincidir con palabras clave
    const keywords = ["pug", "wig", "yak", "nap", "jig", "mug", "zap", "gag", "oaf", "elf"];
    const regex = new RegExp(keywords.join('|'), 'i');
    const query2Results = await collection.find({ 'question.Title': { $regex: regex } }).toArray();
    console.log(`Consulta 2: ${query2Results.length} resultats trobats`);

    const titlesQuery2 = query2Results.map(doc => doc.question.Title);

    // Generar informe2.pdf
    const filePath2 = path.join(outputDir, 'informe2.pdf');
    await generatePDF(filePath2, titlesQuery2);
    console.log('informe2.pdf generat correctament');

  } catch (error) {
    console.error('Error executant el programa:', error);
  } finally {
    await client.close();
    console.log('Connexió a MongoDB tancada');
  }
}

main();