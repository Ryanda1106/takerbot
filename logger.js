import chalk from 'chalk';
import fs from 'fs';

const LOG_FILE = 'log-taker.txt';

const logger = {
    log: (level, message, value = '') => {
        const now = new Date();
        const formattedDate = now.toLocaleDateString();
        const formattedTime = now.toLocaleTimeString();
        const timestamp = `${formattedDate} | ${formattedTime}`;

        const colors = {
            info: chalk.green,
            warn: chalk.yellow,
            error: chalk.red,
            success: chalk.blue,
            debug: chalk.magenta,
        };

        const color = colors[level] || chalk.white;
        const levelTag = `${level.toUpperCase()}`;
        const formattedMessage = `${chalk.cyanBright(timestamp)} | ${color(levelTag)} | ${message}`;
        let formattedValue = ` ${chalk.green(value)}`;

        if (level === 'error') {
            formattedValue = ` ${chalk.red(value)}`;
        } else if (level === 'warn') {
            formattedValue = ` ${chalk.yellow(value)}`;
        }

        if (typeof value === 'object') {
            const valueColor = level === 'error' ? chalk.red : chalk.green;
            formattedValue = ` ${valueColor(JSON.stringify(value))}`;
        }

        console.log(`${formattedMessage}${formattedValue}`);
        const logToFile = `${timestamp} | ${levelTag} | ${message} ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;

        try {
            fs.appendFileSync(LOG_FILE, logToFile, 'utf8');
        } catch (err) {
            console.error(chalk.red(`[ LOGGER ERROR ] Failed to write log to file: ${err.message}`));
        }
    },

    info: (message, value = '') => logger.log('info', message, value),
    warn: (message, value = '') => logger.log('warn', message, value),
    error: (message, value = '') => logger.log('error', message, value),
    success: (message, value = '') => logger.log('success', message, value),
    debug: (message, value = '') => logger.log('debug', message, value),
};

export default logger;
