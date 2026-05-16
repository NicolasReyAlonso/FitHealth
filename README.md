# FitHealth

¡Bienvenido a **FitHealth**! Esta es una aplicación completa para la gestión de rutinas, eventos y relaciones de salud y fitness.

Este repositorio contiene todo el ecosistema del proyecto organizado en varios componentes y documentación técnica.

## 📂 Estructura del Repositorio

El proyecto está dividido en los siguientes módulos principales:

- **[`Backend/`](./Backend/)**: Contiene la API REST desarrollada en Python (FastAPI). Incluye la configuración de la base de datos, modelos, controladores y `docker-compose.yml` para levantar los servicios del backend.
- **[`Frontend/`](./Frontend/)**: Aplicación móvil desarrollada con React Native y Expo. Contiene las pantallas, componentes y la lógica de la interfaz de usuario.
- **[`Presentation/`](./Presentation/)**: Recursos de la presentación del proyecto en formato HTML/JS. Configurado para desplegarse automáticamente en GitHub Pages usando GitHub Actions.
- **[`UseCaseDiagram/`](./UseCaseDiagram/)**: Diagramas UML y de casos de uso (formatos `.aird`, `.di`, `.notation`, `.uml`).
- **[`ProjectLibre/`](./ProjectLibre/)**: Archivos de planificación y gestión del proyecto.
- **[`Video/`](./Video/)**: Archivos y recursos relacionados con la demostración en video del proyecto (.kdenlive).

## 🚀 Despliegue de la Presentación

La presentación del proyecto web se despliega automáticamente en GitHub Pages cada vez que se hace push a la rama `main`, gracias a GitHub Actions.

## ⚙️ Configuración y Ejecución

Para iniciar el proyecto de forma local, puedes dirigirte a los READMEs específicos de cada carpeta principal:

1. **Backend**: Revisa el [`Backend/README.md`](./Backend/README.md) para instalar dependencias (`requirements.txt`) o usar Docker.
2. **Frontend**: Revisa el [`Frontend/FitHealth/README.md`](./Frontend/FitHealth/README.md) para instrucciones sobre cómo levantar la app con Expo (`npm start`).

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Python, FastAPI, SQLAlchemy
- **Despliegue/Infraestructura**: Docker, GitHub Actions (para la web de la presentación)
