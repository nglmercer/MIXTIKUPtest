/**
 * Envoltorio para conexión TikTok del lado del cliente a través de Socket.IO
 * Con funcionalidad de reconexión.
 */
class TikTokIOConnection {
    constructor(backendUrl, proxyUrl = null) {
        this.socket = io(backendUrl, proxyUrl ? { transportOptions: { polling: { extraHeaders: { 'Proxy': proxyUrl } } } } : {});
        this.uniqueId = null;
        this.options = null;
        this.cache = new Map();

        this.socket.on('connect', () => {
            console.info("Socket connected!");

            // Reconnect to streamer if uniqueId already set
            if (this.uniqueId) {
                this.setUniqueId();
            }
        });

        this.socket.on('disconnect', () => {
            console.warn("Socket disconnected!");
        });

        this.socket.on('streamEnd', (actionId) => {
            if (actionId === 3) {
                console.warn('Stream ended by user');
            }
            if (actionId === 4) {
                console.warn('Stream ended by platform moderator (ban)');
            }
            this.uniqueId = null;
        });

        this.socket.on('tiktokDisconnected', (errMsg) => {
            console.warn(errMsg);
            if (errMsg && errMsg.includes('LIVE has ended')) {
                this.uniqueId = null;
            }
        });
    }

    connect(uniqueId, options) {
        this.uniqueId = uniqueId;
        this.options = options || {};

        // Verificar si los datos ya están en caché
        if (this.cache.has(this.uniqueId)) {
            return Promise.resolve(this.cache.get(this.uniqueId));
        }
        this.setUniqueId();

        return new Promise((resolve, reject) => {
            this.socket.once('tiktokConnected', (data) => {
                this.cache.set(this.uniqueId, data); // Guardar los datos en caché
                resolve(data);
            });
            this.socket.once('tiktokDisconnected', reject);

            setTimeout(() => {
                reject('Connection Timeout');
            }, 30000);
        });
    }

    setUniqueId = () => {
        this.socket.emit('setUniqueId', this.uniqueId, this.options);
    }

    on = (eventName, eventHandler) => {
        this.socket.on(eventName, eventHandler);
    }
}