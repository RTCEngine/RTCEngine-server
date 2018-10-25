
import { NextFunction, Response, Request, Router } from 'express'
import * as cors from 'cors'
import * as jwt from 'jwt-simple'
import turn from './turn'
import config from './config'
import Logger from './logger'

const log = new Logger('api')

const apiRouter = Router()

apiRouter.get('/test', async (req: Request, res: Response) => {
    res.send('hello world')
})

apiRouter.options('/api/generateToken', cors())
apiRouter.post('/api/generateToken', async (req: Request, res: Response) => {

    let appkey = req.body.appkey
    let room = req.body.room
    let user = req.body.user
    
    let secret = config.server.secret                

    let iceServers = []

    for (let server of config.iceServers) {
        let iceServer = turn.genRestTurn(server.host,server.port,server.transports,server.secret)
        iceServers.push(iceServer)
    }

    let wsUrl = config.server.externalUrl

    let data = {
        room: room,
        user: user,
        wsUrl: wsUrl,
        iceServers: iceServers,
        iceTransportPolicy: config.media.iceTransportPolicy
    }

    let token: string = jwt.encode(data, secret)


    res.json({
        s: 10000,
        d: { token: token },
        e: ''
    })
})

export default apiRouter