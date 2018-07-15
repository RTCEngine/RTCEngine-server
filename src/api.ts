
import { NextFunction, Response, Request, Router } from 'express'
import * as cors from 'cors'
import * as jwt from 'jwt-simple'
import * as turn from './turn'
import config from './config'
import Logger from './logger'

const log = new Logger('api')

const apiRouter = Router()

apiRouter.get('/test', async (req: Request, res: Response) => {
    res.send('hello world')
})

apiRouter.options('/api/generateToken', cors())
apiRouter.post('/api/generateToken', async (req: Request, res: Response) => {

    let secret = config.server.secret
    let room = req.body.room
    let user = req.body.user

    let turnServers = turn.genRestTurn(config.turnServer.urls)

    let wsUrl = config.server.externalUrl

    let data = {
        room: room,
        user: user,
        wsUrl: wsUrl,
        iceServers: turnServers
    }

    let token: string = jwt.encode(data, secret)

    log.debug('token', token)

    res.json({
        s: 10000,
        d: { token: token },
        e: ''
    })
})

export default apiRouter