const { spawn } = require('child_process');

const SERVER_PATH = '/Users/home/.npm/_npx/8ddf6bea01b2519d/node_modules/@testsprite/testsprite-mcp/dist/index.js';

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
    if (!isNotification) {
        payload.id = msgId++;
    }
    const msg = JSON.stringify(payload) + '\n';
    log(`SEND: ${method}${isNotification ? ' (notification)' : ''}`);
    server.stdin.write(msg);
}

server.stdout.on('data', (data) => {
    const chunks = data.toString().split('\n');
    for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        console.log('RECV:', chunk);
        try {
            if (chunk.startsWith('{')) {
                const json = JSON.parse(chunk);
                if (json.error) {
                    log(`ERROR (ID ${json.id}): ${JSON.stringify(json.error)}`);
                }
                if (json.id === 1) { // Initialize response
                    send('notifications/initialized', {}, true);
                    log('Waiting for server to settle...');
                    setTimeout(() => {
                        send('tools/call', {
                            name: 'testsprite_bootstrap_tests',
                            arguments: {
                                projectPath: '/Users/home/Documents/Info Site/mubasher-deep-extract',
                                type: 'backend',
                                testScope: 'codebase',
                                localPort: 8000
                            }
                        });
                    }, 2000);
                } else if (json.id === 2 && !json.error) { // Bootstrap response
                    log('BOOTSTRAP SUCCESS');
                    send('tools/call', {
                        name: 'testsprite_generate_code_summary',
                        arguments: {
                            projectRootPath: '/Users/home/Documents/Info Site/mubasher-deep-extract'
                        }
                    });
                } else if (json.id === 3 && !json.error) { // Code summary response
                    log('ANALYSIS SUCCESS');
                    send('tools/call', {
                        name: 'testsprite_generate_backend_test_plan',
                        arguments: {
                            projectPath: '/Users/home/Documents/Info Site/mubasher-deep-extract'
                        }
                    });
                } else if (json.id === 4 && !json.error) { // Test plan response
                    log('TEST PLAN SUCCESS');
                    send('tools/call', {
                        name: 'testsprite_generate_code_and_execute',
                        arguments: {
                            projectName: 'mubasher-deep-extract',
                            projectPath: '/Users/home/Documents/Info Site/mubasher-deep-extract',
                            testIds: [],
                            additionalInstruction: 'Ensure all Yahoo endpoints are covered and verified against the backend schema.'
                        }
                    });
                } else if (json.id === 5 && !json.error) { // Execution response
                    log('EXECUTION SUCCESS');
                    process.exit(0);
                } else if (json.error) {
                    log(`ABORTING DUE TO ERROR AT ID ${json.id}`);
                    process.exit(1);
                }
            }
        } catch (e) {
            // Not a valid JSON or other error
        }
    }
});

server.stderr.on('data', (data) => {
    if (data.toString().includes('error')) {
        console.error('SERVER LOG:', data.toString());
    }
});

send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'cli-bootstrap', version: '1.0.0' }
});

// Timeout after 5 minutes
setTimeout(() => {
    console.error('TIMEOUT');
    process.exit(1);
}, 300000);
