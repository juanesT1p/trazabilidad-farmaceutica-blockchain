# Decisión: versiones

Se fijó Hardhat 3 porque es la línea estable vigente y se usó su API real `network.create()` con el toolbox Mocha/Ethers. Se fijó Node 24 como línea LTS del proyecto, aunque el entorno de ejecución tenía Node 26 Current. Se fijó Prisma 7.10.1 y se implementó su configuración real con `prisma.config.ts` y `@prisma/adapter-pg`.
