# AMS2-MP06-UF3 Repositori d'Exemple

Aquest repositori proporciona un exemple pràctic d'integració de MongoDB amb Node.js, demostrant com carregar dades XML a una base de dades MongoDB.

## Descripció del Projecte

Aquest projecte és un exemple que demostra com utilitzar Node.js per processar un fitxer XML de YouTubers i carregar-lo a una base de dades MongoDB. S'utilitza un entorn Docker per proporcionar tant el servidor MongoDB com una interfície visual MongoDB Express per facilitar l'exploració de les dades.

## Característiques

- **Càrrega de dades XML** a MongoDB utilitzant Node.js
- **Entorn Docker** amb MongoDB i MongoDB Express configurat
- **Processament de dades XML** amb transformació a format adequat per MongoDB
- **Gestió d'entorns** amb fitxers .env
- **Estructura modular** i fàcil d'entendre

## Requisits

- Node.js >= 14.x
- npm >= 6.x
- Docker i Docker Compose

## Instal·lació

1. Clona el repositori:
```bash
git clone <url-del-repositori>
cd DAM-M06-UF03-Punt-Partida-NodeJS
```

2. Inicia els contenidors Docker:
```bash
cd docker
docker-compose up -d
```

3. Instal·la les dependències del projecte:
```bash
cd ../exemple-mongodb
npm install
```

## Estructura del Projecte

```
.
├── data/
│   └── youtubers.xml            # Fitxer XML d'exemple amb dades de YouTubers
│
├── docker/
│   └── docker-compose.yml       # Configuració de Docker per MongoDB i MongoDB Express
│
├── exemple-mongodb/
│   ├── .env                     # Variables d'entorn
│   ├── package.json             # Dependències i scripts
│   └── src/
│       └── load-xml-to-mongodb.js # Script principal per carregar XML a MongoDB
│
├── README.md                    # Aquest fitxer
└── doc/                         # Documentació addicional
```

## Ús

### Iniciar l'entorn MongoDB

```bash
cd docker
docker-compose up -d
```

Això inicia:
- MongoDB al port 27017
- MongoDB Express al port 8081 (accessible via http://localhost:8081)

### Carregar dades XML a MongoDB

```bash
cd exemple-mongodb
npm start
```

Aquest comando executa el script `load-xml-to-mongodb.js` que:
1. Llegeix el fitxer XML de la carpeta `data`
2. Processa les dades per adaptar-les a l'estructura de MongoDB
3. Elimina qualsevol dada existent a la col·lecció
4. Inserta les noves dades a la base de dades MongoDB

### Accedir a les Dades amb MongoDB Express

Un cop carregades les dades, pots visualitzar-les i manipular-les a través de la interfície web de MongoDB Express:

```
http://localhost:8081
```

1. Inicia sessió amb les credencials configurades al `docker-compose.yml`
2. Navega a la base de dades `youtubers_db`
3. Explora la col·lecció `youtubers`

## Estructura de les Dades

L'estructura de les dades XML segueix aquest format:

- **Youtuber**: Informació bàsica sobre el youtuber
  - **Channel**: Nom del canal
  - **Name**: Nom del creador
  - **Subscribers**: Nombre de subscriptors
  - **JoinDate**: Data de creació del canal
  - **Categories**: Llista de categories del canal
  - **Videos**: Llista de vídeos publicats
    - **Video**: Informació sobre un vídeo específic
      - **Title**: Títol del vídeo
      - **Duration**: Durada del vídeo
      - **Views**: Nombre de visualitzacions
      - **UploadDate**: Data de pujada
      - **Likes**: Nombre de "m'agrada"
      - **Comments**: Nombre de comentaris

## Components Principals

### Docker

El projecte utilitza Docker per proporcionar:
- **MongoDB**: Base de dades NoSQL
- **MongoDB Express**: Interfície web per gestionar MongoDB

### Script de Càrrega

El script `load-xml-to-mongodb.js` realitza les següents funcions:
- Lectura del fitxer XML utilitzant `fs`
- Anàlisi del XML a objectes JavaScript amb `xml2js`
- Transformació de les dades a un format adequat per MongoDB
- Connexió a MongoDB utilitzant el client oficial de MongoDB per Node.js
- Inserció de les dades processades a la base de dades

## Dependències Principals

- **mongodb**: Client oficial de MongoDB per Node.js
- **xml2js**: Parser XML per Node.js
- **dotenv**: Gestió de variables d'entorn

## Contribució

Si vols contribuir a aquest projecte, segueix els passos:

1. Fes un fork del repositori
2. Crea una branca per a la teva característica (`git checkout -b feature/caracteristica-nova`)
3. Fes commit dels teus canvis (`git commit -am 'Afegeix característica nova'`)
4. Puja els canvis (`git push origin feature/caracteristica-nova`)
5. Crea una Pull Request

## Llicència

Aquest projecte està llicenciat sota la llicència MIT. Consulta el fitxer `LICENSE` per a més detalls.
