
import * as http from 'http'
import * as program from 'commander'
import * as dotenv from 'dotenv'

dotenv.config()

import Server from './src/server'
import config from './src/config'

const server = new Server()




