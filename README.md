# Tasador Inmobiliario

App para tasar propiedades in situ (desde el celular durante la visita): valor del inmueble + llave de negocio (consultorios), con historial e informe imprimible / PDF.

## Pantallas

| URL            | Quién          | Qué hace                                                            |
| -------------- | -------------- | ------------------------------------------------------------------- |
| `/login.html`  | Todos          | Ingreso con usuario y contraseña                                    |
| `/`            | Agente y admin | Tasador. Cada agente ve solo su propio historial                    |
| `/panel.html`  | Agente y admin | Panel. Agente: sus tasaciones e indicadores. Admin: además, resumen por agente y filtro |

## Usuarios

La primera vez que arranca el backend se crean estos usuarios de prueba:

| Usuario  | Contraseña  | Rol           |
| -------- | ----------- | ------------- |
| `admin`  | `admin123`  | Administrador |
| `mlopez` | `agente123` | Agente        |
| `jperez` | `agente123` | Agente        |

Con `DEMO_MODE=true` (en `backend/.env`) el login los muestra en un cuadro y se cargan tasaciones de ejemplo. **En producción: `DEMO_MODE=false` y crear usuarios reales:**

```bash
npm run usuario:crear -- --usuario mgarcia --nombre "Marta García" --password "unaClaveSegura" --rol agente
```

Los usuarios se guardan en `backend/data/usuarios.json` con la contraseña hasheada (scrypt). Para empezar de cero con los datos de prueba, borrar la carpeta `backend/data/`.

## Estructura

```
TasadorInmobiliario/
├── shared/      Lógica de tasación (fórmula + coeficientes). La usan front y back.
├── frontend/    Interfaz web (Vite + JavaScript, sin framework).
├── backend/     API REST (Node + Express). Guarda el historial de tasaciones.
└── docs/        Template original de referencia.
```

| Necesito…                                  | Archivo                                   |
| ------------------------------------------ | ----------------------------------------- |
| Cambiar un % (estado, disposición, etc.)   | `shared/src/coeficientes.js`              |
| Cambiar la fórmula                         | `shared/src/tasacion.js`                  |
| Cambiar colores / marca                    | `frontend/src/styles/tokens.css`          |
| Cambiar el nombre de la inmobiliaria       | `frontend/.env` → `VITE_INMOBILIARIA_NOMBRE` |
| Dónde se guardan los datos (JSON / MongoDB) | `backend/src/repositories/`              |

## Puesta en marcha

Requiere **Node 22 o superior**.

```bash
npm install

# Variables de entorno (solo la primera vez)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

npm run dev     # API en :3001 + web en :5173
```

Abrir http://localhost:5173. Para probar desde el celular en la misma red: `npm run dev:web -- --host`.

## Scripts

| Comando         | Qué hace                                               |
| --------------- | ------------------------------------------------------ |
| `npm run dev`   | Levanta backend y frontend en modo desarrollo          |
| `npm run build` | Compila el frontend en `frontend/dist`                 |
| `npm start`     | Levanta el backend (con `SERVE_FRONTEND=true` sirve también la web) |
| `npm test`      | Corre los tests de la fórmula de tasación              |
| `npm run usuario:crear -- …` | Crea un usuario (ver sección Usuarios)    |

## Staging en Render

Un solo servicio web: el backend sirve la API y la web compilada en la misma URL. La configuración está en [`render.yaml`](render.yaml).

1. **Base de datos.** Crear un cluster gratis (M0) en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). En *Database Access* crear un usuario con contraseña; en *Network Access* permitir `0.0.0.0/0` (Render gratis no tiene IP fija). Copiar la cadena de conexión (`mongodb+srv://...`).
2. **Render.** Ir a New → Blueprint, elegir este repositorio y pegar la `MONGODB_URI` cuando la pida. `AUTH_SECRET` se genera solo.
3. Cada `git push` a `develop` vuelve a desplegar automáticamente. `main` queda reservada para producción.

Las colecciones e índices se crean solos al arrancar. Sin `MONGODB_URI`, los datos van a archivos JSON, que en Render se borran en cada reinicio (el log lo avisa).

Para crear usuarios reales en staging, correr el comando desde la PC apuntando a esa base:

```bash
MONGODB_URI="mongodb+srv://..." npm run usuario:crear -- --usuario mgarcia --nombre "Marta García" --password "unaClaveSegura"
```

Con `NODE_ENV=staging` o `production` el backend no arranca si falta `AUTH_SECRET`.

> Plan gratis de Render: si nadie la usa por 15 minutos, la app se duerme y la primera visita tarda unos 50 segundos en despertarla.

## Instalar en el celular

Es una PWA: se instala desde el navegador, sin tienda de apps.

- **Android (Chrome):** abrir la URL → menú ⋮ → *Agregar a la pantalla principal* / *Instalar app*.
- **iPhone (Safari):** abrir la URL → botón Compartir → *Agregar a inicio*.

Queda con ícono propio y se abre a pantalla completa. Las actualizaciones llegan solas al volver a abrirla (no hay que reinstalar).

## API

Las rutas marcadas con 🔒 requieren `Authorization: Bearer <token>` (se obtiene en `/api/auth/login`).

| Método | Ruta                      | Acceso      | Descripción                                    |
| ------ | ------------------------- | ----------- | ---------------------------------------------- |
| GET    | `/api/health`             | Público     | Estado del servicio                            |
| GET    | `/api/config`             | Público     | Coeficientes de tasación                       |
| POST   | `/api/auth/login`         | Público     | `{ usuario, password }` → `{ token, expiraEn, usuario }` |
| GET    | `/api/auth/me`            | 🔒          | Usuario de la sesión                           |
| GET    | `/api/auth/demo`          | Público     | Accesos de prueba (vacío si `DEMO_MODE=false`) |
| GET    | `/api/tasaciones`         | 🔒          | Agente: las suyas. Admin: todas (`?agenteId=` para filtrar) |
| GET    | `/api/tasaciones/:id`     | 🔒          | Una tasación (propia, o cualquiera si es admin)|
| POST   | `/api/tasaciones`         | 🔒          | Guarda `{ datos, propiedad }`; el servidor recalcula y asigna el agente de la sesión |
| DELETE | `/api/tasaciones/:id`     | 🔒          | Elimina (propia, o cualquiera si es admin)     |
| GET    | `/api/admin/agentes`      | 🔒 admin    | Resumen por agente: cantidad, valor total, última |

## Cómo se calcula

**Inmueble**
- Superficie homogeneizada = cubierta + descubierta × 50%
- Valor de lista = sup. homogeneizada × precio base zona × coef. estado × coef. disposición
- Valor inmueble = valor de lista − margen de negociación

**Llave de negocio** (opcional)
- Ingresos mensuales = consultorios × canon × ocupación
- EBITDA anual = (ingresos − gastos fijos) × 12
- Valor llave = EBITDA anual × múltiplo (años de recupero). Si el EBITDA no es positivo, la llave vale 0.

**Total sugerido** = inmueble + llave.
