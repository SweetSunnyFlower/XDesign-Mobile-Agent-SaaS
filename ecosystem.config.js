module.exports = {
    apps: [
        {
            name: 'nextjs-app',
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
    ],
};
