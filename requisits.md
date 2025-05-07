# Mini‑Servidor WebSocket de Registre d’Esdeveniments de Joc  
**Fitxa de Requisits**

Autor: *Joan Martinez Marin*  
Data: *2025‑05‑07*  

---

## 1. Objectiu Principal
Construir un **servidor WebSocket** amb **Node.js** que rebi els moviments 2D d’un jugador (client Node.js) en format JSON i els **emmagatzemi a MongoDB**.  
El servidor ha de considerar que la partida finalitza si el jugador passa *10 s* sense moure’s; aleshores cal calcular la **distància en línia recta** entre el punt inicial i el final i notificar‑la al client. Tots els esdeveniments clau s’han de **registrar amb Winston** a consola i a fitxer.

---

## 2. Requisits Funcionals (Què ha de fer)

| Codi | Descripció |
|------|------------|
| **RF‑01** | El servidor WebSocket s’inicia i escolta connexions entrants en un **port configurable** (`PORT`). |
| **RF‑02** | Els **clients WebSocket** poden connectar‑se i rebre un missatge de benvinguda. |
| **RF‑03** | El client envia **moviments** (fletxes: ← ↑ → ↓) periòdicament en format JSON. |
| **RF‑04** | Cada missatge JSON conté: `playerId` (string), `gameId` (string), `x` (number), `y` (number). |
| **RF‑05** | El servidor processa els missatges, valida l’estructura i descarta/loga els invàlids. |
| **RF‑06** | El servidor afegeix un **timestamp UTC** a cada moviment vàlid. |
| **RF‑07** | Cada moviment es desa com a **document individual** a la col·lecció `players` de MongoDB. |
| **RF‑08** | El servidor manté un **temporitzador de 10 s** per jugador; si expira, la partida finalitza. |
| **RF‑09** | A la fi de la partida el servidor calcula la **distància euclidiana** entre (x₀, y₀) i (xₙ, yₙ). |
| **RF‑10** | El servidor envia al client un missatge `lost` amb la distància i registra l’esdeveniment. |
| **RF‑11** | El servidor gestiona la **desconnexió** dels clients i neteja els temporitzadors. |

---

## 3. Requisits No Funcionals (Com ho ha de fer)

| Codi | Descripció |
|------|------------|
| **RNF‑01 — Logging** | Implementar **Winston** amb dos *transports*: consola (color + timestamp) i fitxer `game_server.log`. Registrar inici, connexió/desconnexió, errors, moviment rebut, guardat a BD i final de partida. |
| **RNF‑02 — Configuració** | Utilitzar **variables d’entorn** (`PORT`, `MONGODB_URI`) o fitxer `.env`. Rang d’inactivitat (10 s) fàcilment modificable. |
| **RNF‑03 — Mantenibilitat** | Codi clar i **comentat**; mòduls separats (`server`, `logger`, `db`). |
| **RNF‑04 — Fiabilitat** | Gestió d’errors (ex.: fallada de connexió a BD) sense aturar el servidor; ús de *try/catch* i *reconnect/back‑off* si cal. |

---

## 4. Format del Missatge JSON (Client → Servidor)

```jsonc
{
  "playerId": "string", // Identificador del jugador (ex.: "P‑001")
  "gameId":  "string",  // Identificador de la partida en curs (ex.: "G‑A123")
  "x":       number,    // Coordenada X (ex.: 12.5)
  "y":       number     // Coordenada Y (ex.: 7.0)
}
```