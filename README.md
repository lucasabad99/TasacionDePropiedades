# Tasador Inmobiliario

App para tasar propiedades in situ (desde el celular durante la visita): valor del inmueble + llave de negocio (consultorios), con historial e informe imprimible / PDF.

## Pantallas

| URL            | Quién          | Qué hace                                                            |
| -------------- | -------------- | ------------------------------------------------------------------- |
| `/`             | Público        | Página de la inmobiliaria: propiedades en cards (detalle al tocarlas, con fotos y el agente que la cargó), historia y formulario de contacto |
| `/login.html`   | Agentes        | Ingreso con usuario y contraseña                                    |
| `/tasador.html` | Agente y admin | Tasador, con fotos opcionales. Cada agente ve solo su propio historial |
| `/panel.html`   | Agente y admin | Panel. Agente: sus tasaciones, indicadores y consultas sobre sus propiedades. Admin: además, resumen por agente, filtro y todas las consultas |

Desde la app, el botón **Sitio** de la barra superior abre la página pública; desde la página pública, **Agentes / Ir a la app** vuelve a la app.

**Página pública:** cada tasación aparece salvo que se apague *Mostrar en la página pública* (al cargarla o después, desde el detalle en el panel). Nunca se publica el cliente / propietario. Las fotos se comprimen en el navegador (~300 KB, hasta 12 por tasación) y se guardan en MongoDB. Los textos de *Historia* y los datos de contacto se editan en [`frontend/src/config/sitio.js`](frontend/src/config/sitio.js).

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
| Actualizar precios de referencia del m²    | `shared/src/referencias-m2.js`            |
| Cambiar colores / marca                    | `frontend/src/styles/tokens.css`          |
| Historia y datos de contacto de la página  | `frontend/src/config/sitio.js`            |
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

Abrir http://localhost:5173 (página pública) o http://localhost:5173/tasador.html (tasador). Para probar desde el celular en la misma red: `npm run dev:web -- --host`.

## Scripts

| Comando         | Qué hace                                               |
| --------------- | ------------------------------------------------------ |
| `npm run dev`   | Levanta backend y frontend en modo desarrollo          |
| `npm run build` | Compila el frontend en `frontend/dist`                 |
| `npm start`     | Levanta el backend (con `SERVE_FRONTEND=true` sirve también la web) |
| `npm test`      | Corre los tests de la fórmula de tasación              |
| `npm run usuario:crear -- …` | Crea un usuario (ver sección Usuarios)    |

## Precios de referencia del m²

Al elegir **Ubicación** (CABA o Provincia), **Barrio / Partido**, **Ambientes** y **A estrenar**, el tasador propone el precio base y muestra de dónde sale. El agente lo puede cambiar; si lo cambió a mano, la app no se lo pisa (el botón **Usar** vuelve a la referencia).

| Ubicación  | Fuente                                                                 | Detalle                                         |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| CABA       | IDECBA, *Dinámica del mercado de venta de departamentos* (trimestral) | Por comuna del barrio, 1/2/3 amb., usado / a estrenar |
| Provincia  | Index Zonaprop GBA Norte, Oeste y Sur (mensual)                        | Por municipio                                   |

Son **precios de publicación** (oferta), no de escritura. Cada tasación guarda la referencia que usó, con fuente y período, y sale en el informe impreso.

**Actualizar cada trimestre:** seguir los pasos del encabezado de [`shared/src/referencias-m2.js`](shared/src/referencias-m2.js), correr `npm test` y subir a `develop`.

## Staging en Netlify

La web se sirve desde el CDN de Netlify y la API corre como Netlify Function ([`netlify/functions/api.mjs`](netlify/functions/api.mjs)), usando la misma app de Express que en local. No hay servidor que se duerma: la primera carga es inmediata. La configuración está en [`netlify.toml`](netlify.toml).

1. **Base de datos.** Crear un cluster gratis (M0) en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). En *Database Access* crear un usuario con contraseña; en *Network Access* permitir `0.0.0.0/0` (las funciones no tienen IP fija). Copiar la cadena de conexión (`mongodb+srv://...`).
2. **Netlify.** Add new project → Import an existing project → GitHub → este repositorio, rama `develop`. Build, carpeta y funciones se leen solos de `netlify.toml`.
3. **Variables de entorno** (Site configuration → Environment variables). Las de `netlify.toml` no llegan a la función, por eso van acá:

   | Variable                   | Valor                                                                 |
   | -------------------------- | --------------------------------------------------------------------- |
   | `MONGODB_URI`              | La cadena de Atlas (marcarla como secreta)                            |
   | `MONGODB_DB`               | `tasador`                                                             |
   | `AUTH_SECRET`              | Generarla con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` (secreta) |
   | `NODE_ENV`                 | `staging`                                                             |
   | `DEMO_MODE`                | `true` (pasar a `false` cuando haya usuarios reales)                  |
   | `SESION_HORAS`             | `12`                                                                  |
   | `VITE_INMOBILIARIA_NOMBRE` | `Tasador Inmobiliario`                                                |

4. Cada `git push` a `develop` vuelve a desplegar automáticamente. `main` queda reservada para producción.

Las colecciones e índices se crean solos en la primera petición. En Netlify `MONGODB_URI` es obligatoria (el disco de las funciones es de solo lectura).

Para crear usuarios reales en staging, correr el comando desde la PC apuntando a esa base:

```bash
MONGODB_URI="mongodb+srv://..." npm run usuario:crear -- --usuario mgarcia --nombre "Marta García" --password "unaClaveSegura"
```

Con `NODE_ENV=staging` o `production` el backend no arranca si falta `AUTH_SECRET`.

> [`render.yaml`](render.yaml) sigue en el repo como alternativa (un servidor Node en Render), pero en el plan gratis se duerme a los 15 minutos y tarda ~50 s en despertar.

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
