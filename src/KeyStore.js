const {
  pbkdf2Sync,
  randomBytes,
  createCipheriv,
  createDecipheriv
} = require('crypto');
const createKeccakHash = require('keccak/js');

const algo = 'aes-256-cbc' // 'aes-128-ctr'
const digest = 'sha512' // 'sha256'
const iteration = 1000 // 1000
const cipherKeyLength = 64 // 32
const saltBytes = 32
const ivBytes = 16

/**
 * Derive secret key from password with key dervation function.
 * @param {string} password User-supplied password.
 * @param {buffer} salt Randomly generated salt.
 * @returns {buffer}
 */
function deriveKey (password, salt) {
  return pbkdf2Sync(password, salt, iteration, cipherKeyLength, digest)
}

/**
 * Generate random salt and IV (initialization vector)
 * @returns {Object}
 * salt {buffer}
 * iv {buffer}
 */
function createSaltAndIV () {
  const rdBytes = randomBytes(saltBytes + ivBytes)
  return {
    salt: rdBytes.slice(0, saltBytes),
    iv: rdBytes.slice(saltBytes, saltBytes + ivBytes)
  }
}

/**
 * Convert object's own values from buffer to string (hex encoded)
 * @param {Object} obj
 * @returns {Object}
 */
function objBuf2Str (obj) {
  return Object.keys(obj).reduce(
    (acc, key) => ({ ...acc, [key]: obj[key].toString('hex') }),
    {}
  )
}

/**
 * Convert object's own values from string (hex encoded) to buffer
 * @param {Object} obj
 * @returns {Object}
 */
function objStr2Buf (obj) {
  return Object.keys(obj).reduce(
    (acc, key) => ({ ...acc, [key]: Buffer.from(obj[key], 'hex') }),
    {}
  )
}

/**
 * Compute Keccak-256 hash
 * @param {buffer} buffer
 * @returns {buffer}
 */
function keccak256 (buffer) {
  return createKeccakHash('keccak256')
    .update(buffer)
    .digest()
}

/**
 * Calculate message authentication code from secret (derived) key and
 * encrypted text. The MAC is the keccak-256 hash of the byte array
 * formed by concatenating the second 32 bytes of the derived key with
 * the ciphertext key's contents.
 * @param {buffer} derivedKey Secret key derived from password.
 * @param {string} ciphertext Text encrypted with secret key.
 * @return {buffer}
 */
function getMAC (derivedKey, ciphertext) {
  return keccak256(
    Buffer.concat([
      derivedKey.slice(cipherKeyLength / 2, cipherKeyLength),
      ciphertext
    ])
  )
}

/**
 * Generate Keystore file
 *
 * @param {string} password User-supplied password
 * @param {string} sk secret key to be encrypted
 * @param {string} pk public key is not encrypted
 * @returns {Object} keyObject
 * sk {string}
 * pk {string}
 * salt {string}
 * iv {string}
 * mac {string}
 */
function generateKeyStoreFile (password, sk, pk) {
  if (!password || !sk) throw new Error('Insufficient data provided')

  const { salt, iv } = createSaltAndIV()
  const key = deriveKey(password, salt)
  const cipher = createCipheriv(algo, key.slice(0, cipherKeyLength / 2), iv)
  const cipherSk = Buffer.concat([cipher.update(sk), cipher.final()])
  const mac = getMAC(key, cipherSk)
  const keyObject = objBuf2Str({ sk: cipherSk, salt, iv, mac })

  keyObject.pk = pk || ''

  return keyObject
}

/**
 * Recover secret and public keys from keystore file
 *
 * @param {string} password
 * @param {Object} keyObject {sk {string}, pk {stting}, salt {string}, iv {string}, mac {string}}
 * @returns {Object}
 * sk {string} decrypted secret key
 * pk {string} public key
 */
function recoverKeys (password, keyObject) {
  const { sk, salt, iv, mac } = objStr2Buf(keyObject)

  if (!sk || !salt || !iv || !mac) {
    throw new Error('Insufficient data provided')
  }

  const key = deriveKey(password, salt)
  const checkMac = getMAC(key, sk)

  if (mac.toString('hex') !== checkMac.toString('hex')) {
    throw new Error('Message authentication code mismatch')
  }

  const decipher = createDecipheriv(algo, key.slice(0, cipherKeyLength / 2), iv)
  const decypheredSk = Buffer.concat([decipher.update(sk), decipher.final()])

  return {
    sk: decypheredSk.toString(),
    pk: keyObject.pk
  }
}

module.exports = {
  generateKeyStoreFile,
  recoverKeys,
};
