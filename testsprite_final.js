const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_PATH = '/Users/home/.npm/_npx/8ddf6bea01b2519d/node_modules/@testsprite/testsprite-mcp/dist/index.js';
const PROJECT_PATH = '/Users/home/Documents/Info Site/mubasher-deep-extract';

const server = spawn('node', [SERVER_PATH], {
    env: {
        ...process.env,
        API_KEY: 'sk-user-_UPrv3F9Z2jF_F63mtdLbiX5z6bYNCd61izxGuCukdiGB73Oa_5CSV4HsC9LX1XIE3DSjbCRbYFadUcpGsXXPwDtW5Id1ubNL471Rj_w05tmkrgPa6arf6TkFeFL9RgVijk'
    }
});

function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

let msgId = 1;
function send(method, params, isNotification = false) {
    const payload = { jsonrpc: '2.0', method, params };
    if (!isNotification) payload.id = msgId++;
    const msg = JSON.stringify(payload) + '\n';
    log(`SEND: ${method} (ID: ${payload.id || 'notif'})`);
    server.stdin.write(msg);
}

server.stdout.on('data', (data) => {
    const chunks = data.toString().split('\n');
    for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        if (!chunk.startsWith('{')) {
            log(`SERVER LOG: ${chunk}`);
            continue;
        }
        log(`RECV: ${chunk}`);
        try {
            const json = JSON.parse(chunk);
            if (json.error) {
                log(`ERROR (ID ${json.id}): ${JSON.stringify(json.error)}`);
                process.exit(1);
            }
            if (json.id === 1) { // Initialize response
                send('notifications/initialized', {}, true);
                log('Wait 2s...');
                setTimeout(() => {
                    send('tools/call', {
                        name: 'testsprite_bootstrap_tests',
                        arguments: { projectPath: PROJECT_PATH, type: 'backend', testScope: 'codebase', localPort: 8000 }
                    });
                }, 2000);
            } else if (json.id === 2) { // Bootstrap response
                log('BOOTSTRAP DONE');
                send('tools/call', {
                    name: 'testsprite_generate_code_summary',
                    arguments: { projectRootPath: PROJECT_PATH }
                });
            } else if (json.id === 3) { // Summary response
                log('SUMMARY DONE');
                send('tools/call', {
                    name: 'testsprite_generate_standardized_prd',
                    arguments: { projectPath: PROJECT_PATH }
                });
            } else if (json.id === 4) { // PRD response
                log('PRD DONE');
                send('tools/call', {
                    name: 'testsprite_generate_backend_test_plan',
                    arguments: { projectPath: PROJECT_PATH }
                });
            } else if (json.id === 5) { // Plan response
                log('PLAN DONE');
                send('tools/call', {
                    name: 'testsprite_generate_code_and_execute',
                    arguments: {
                        projectName: 'mubasher-deep-extract',
                        projectPath: PROJECT_PATH,
                        testIds: [],
                        additionalInstruction: 'Validate backend API endpoints and data schema alignment.'
                    }
                });
            } else if (json.id === 6) { // Execute response
                log('EXECUTION DONE');
                log('FINAL RESULT: ' + JSON.stringify(json.result, null, 2));
                process.exit(0);
            }
        } catch (e) { log(`PARSE ERROR: ${e.message}`); }
    }
});

server.stderr.on('data', (data) => log(`STDERR: ${data.toString()}`));

send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'final-testsprite-client', version: '1.0.0' }
});

setTimeout(() => { log('GLOBAL TIMEOUT'); process.exit(1); }, 600000);
