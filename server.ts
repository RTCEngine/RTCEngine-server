
import * as http from 'http'
import * as program from 'commander'
import * as dotenv from 'dotenv'
import ip  = require('ip')

dotenv.config()

import Server from './src/server'
import config from './src/config'


if (process.env.DEV) {
    //config.server.host = ip.address()
    // console.log('listen on ', config.server.host,config.server.port)
}

const server = new Server()




