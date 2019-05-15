import {format, createLogger, transports } from 'winston'


const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.Console()
    ]
})


if (process.env.NODE_ENV === 'production') {
    logger.level = 'error'
}

export default logger
