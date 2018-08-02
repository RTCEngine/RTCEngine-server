

## meta data  


```
room_emta
{
    id: str,  // room id
    peers: [  //  array of peer_meta
        {
            id: str,  // 
            streams: [
                {
                    id: str,  //  stream id
                    bitrate:int, 
                    attributes:any 
                }
            ]
        }
    ]
}

```


```
peer_emta
{

    id: str,  // 
    streams: [
        {
            id: str,  //  stream id
            bitrate:int, 
            attributes:any 
        }
    ]
}

```




###  join

client -> server


```
{
    appkey:str,
    room:str,
    user:str,
    token:str,
    planb:boolean,  // planb or unified-plan
    sdp:str        // offer sdp
}
```


### joined  

server -> client 

```
{
    sdp: str,    // answer  sdp 
    room: room_meta
}

```

### addStream

client -> server 

```
{
    stream: {
        id: str,        // peerId
        msid: str,      // streamid 
        local: bool,    // local or not 
        bitrate: int,   // bitrate
        attributes: any // attributes
    },
    sdp: str  // offer sdp 
}

```


### streamAdded

```
{
    msid: str  // streamid 
}

```


### removeStream

client -> server 

```
{
    stream: {
        id: str,        // peerId
        msid: str,      // streamid 
        local: bool,    // local or not 
        bitrate: int,   // bitrate
        attributes: any // attributes
    },
    sdp: str  // offer sdp 
}
```


### offer 

client -> server

```
{
    sdp: str        // offer sdp 
}
```


### answer 

server -> client 

```
{
    sdp: str,    // answer  sdp 
    room: room_meta
}
```


### offer 

server -> client 

```
{
    sdp: str,    // offer  sdp 
    room: room_meta
}
```


### configure

client -> server,  server -> client 

```
{
    id:str,         // peerId
    msid:str,       // streamId
    local:bool,     // local or not
    remote:bool,    // remote or not
    video:bool,     // mute video or not
    audio:bool,     // mute audio or not 
}
```


### leave

client -> server

```
{

}
```


### peerConnected

server -> client 

```
{
    peer: peer_meta
}
```


### peerRemoved

server -> client 

```
{
    peer: peer_meta
}
```


### message

client -> server,  server -> client 

```
{
    data: any
}
```

