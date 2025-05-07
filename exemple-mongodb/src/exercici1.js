const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const xml2js = require('xml2js');
const winston = require('winston');
require('dotenv').config();

// Ruta al fitxer XML
const xmlFilePath = path.join(__dirname, '../../data/Posts.xml');

// Funció per llegir i analitzar el fitxer XML
async function parseXMLFile(filePath) {
  try {
    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      mergeAttrs: true
    });
    
    return new Promise((resolve, reject) => {
      parser.parseString(xmlData, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  } catch (error) {
    console.error('Error llegint o analitzant el fitxer XML:', error);
    throw error;
  }
}

function processPostsData(data) {
    const posts = Array.isArray(data.posts.row) 
      ? data.posts.row 
      : [data.posts.row];
    
    return posts
      .map(post => {
        if (parseInt(post.ViewCount) > 20000) {
            return {
                question: {
                    Id: post.Id,
                    PostTypeId: post.PostTypeId,
                    AcceptedAnswerId: post.AcceptedAnswerId || null,
                    CreationDate: new Date(post.CreationDate),
                    Score: parseInt(post.Score) || 0,
                    ViewCount: parseInt(post.ViewCount) || 0,
                    Body: post.Body ? post.Body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#xA;/g, '\n') : '',
                    OwnerUserId: post.OwnerUserId || null,
                    LastActivityDate: new Date(post.LastActivityDate),
                    Title: post.Title || '',
                    Tags: post.Tags ? post.Tags.split('><').map(tag => `<${tag.replace(/[<>]/g, '')}>`).join('') : '',
                    AnswerCount: parseInt(post.AnswerCount) || 0,
                    CommentCount: parseInt(post.CommentCount) || 0,
                    FavoriteCount: parseInt(post.FavoriteCount) || 0,
                    ContentLicense: post.ContentLicense || ''
                }
            };
        }
        return null;
    })
    .filter(post => post !== null);
}

// Funció principal per carregar les dades a MongoDB
async function loadDataToMongoDB() {
  // Configuració de la connexió a MongoDB
  const uri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017/';
  const client = new MongoClient(uri);
  
  try {
    const logDir = path.join(__dirname, '../../data/logs');

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Configuracion logger
    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
        ),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: path.join(logDir, 'exercici1.log') })
        ]
    });

    // Connectar a MongoDB
    logger.info('Intentant connectar a MongoDB...');
    await client.connect();
    logger.info('Connectat a MongoDB');
    
    const database = client.db('questions_db');
    const collection = database.collection('questions');
    
    // Llegir i analitzar el fitxer XML
    logger.info('Llegint el fitxer XML...');

    const xmlData = await parseXMLFile(xmlFilePath);
    
    // Processar les dades
    logger.info('Processant les dades de posts...');

    const posts = processPostsData(xmlData);

    
    // Eliminar dades existents (opcional)
    logger.info('Eliminant dades existents...');

    await collection.deleteMany({});
    
    // Inserir les noves dades
    logger.info('Inserint dades a MongoDB...');

    const result = await collection.insertMany(posts);
    
    logger.info(`${result.insertedCount} documents inserits correctament.`);
    logger.info('Dades carregades amb èxit!');

    logger.info('--------------------------------------------');


    
  } catch (error) {
    console.error('Error carregant les dades a MongoDB:', error);
  } finally {
    await client.close();
    console.log('Connexió a MongoDB tancada');
  }
}

// Executar la funció principal
loadDataToMongoDB();