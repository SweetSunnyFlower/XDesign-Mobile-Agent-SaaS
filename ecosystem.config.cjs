module.exports = {
    apps: [
        {
            name: 'xdesign-server',
            script: 'npm',
            args: 'start',
            env: {
                PORT: 8787,
                NODE_ENV: 'production',
            },
            env_development: {
                PORT: 8777,
                NODE_ENV: 'development',
            },
        },
        {
            name: 'xdesign-worker',
            script: 'npm',
            args: 'run start:worker',
            env: {
                NODE_ENV: 'production',
            },
            env_development: {
                NODE_ENV: 'development',
            },
        },
    ],
};
