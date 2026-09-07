const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const getFreePort = () => new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.listen(0, () => {
        const { port } = probe.address();
        probe.close(() => resolve(port));
    });
    probe.on('error', reject);
});

let server;
let port;

const waitForServer = () => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Rating service did not become ready')), 10000);
    server.stdout.on('data', (data) => {
        process.stdout.write(data);
        if (data.toString().includes(`Listening on port ${port}`)) {
            clearTimeout(timeout);
            resolve();
        }
    });
    server.on('close', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Rating service exited before becoming ready (code ${code})`));
    });
});

const finish = (exitCode, mocha) => {
    if (server && !server.killed) {
        server.kill();
    }
    if (mocha && !mocha.killed) {
        mocha.kill();
    }
    process.exit(exitCode);
};

getFreePort()
    .then((freePort) => {
        port = freePort;
        server = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
            env: { ...process.env, PORT: String(port) },
            stdio: ['ignore', 'pipe', 'inherit'],
        });
        server.on('error', error => {
            console.error(error.message);
            finish(1);
        });
        return waitForServer();
    })
    .then(() => new Promise((resolve) => {
        const mocha = spawn(process.execPath, [
            require.resolve('mocha/bin/_mocha'),
            path.join(__dirname, 'completeTest.js'),
        ], {
            env: { ...process.env, RATING_SERVICE_URL: `http://localhost:${port}` },
            stdio: 'inherit',
        });
        mocha.on('close', code => resolve({ code, mocha }));
    }))
    .then(({ code, mocha }) => finish(code, mocha))
    .catch((error) => {
        console.error(error.message);
        finish(1);
    });

