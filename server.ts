import * as program from 'commander'
import * as dotenv from 'dotenv'


dotenv.config()

import SignallingServer from './control/server'


const signalling = new SignallingServer()

signalling.start(3888, '0.0.0.0', () => {
    console.log('signalling server start on', 3888)
})













