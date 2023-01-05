import crypto from "crypto";

const DEFAULT_ALGO = "aes-128-gcm";
const DEFAULT_AUTH_LENGTH = 16;

// FIXME: Add error handling.
export function encrypt(plaintext, algo = DEFAULT_ALGO) {
    const info = crypto.getCipherInfo(algo);
    const key = process.env[`KEY_${info.keyLength}_BYTE`];
    const iv = crypto.randomBytes(info.ivLength);

    const Cipher = crypto.createCipheriv(algo, Buffer.from(key, "hex"), iv);
    const encrypted_plaintext = Cipher.update(plaintext, "utf8", "hex") + Cipher.final("hex");
    const auth = Cipher.getAuthTag();

    return iv.toString("hex") + auth.toString("hex") + encrypted_plaintext;
}

export function decrypt(data, algo = DEFAULT_ALGO) {
    const info = crypto.getCipherInfo(algo);
    const key = process.env[`KEY_${info.keyLength}_BYTE`];
    const iv = data.substr(0, info.ivLength * 2);
    const auth = data.substr(info.ivLength * 2, DEFAULT_AUTH_LENGTH * 2);
    const encrypted_plaintext = data.substr(info.ivLength * 2 + DEFAULT_AUTH_LENGTH * 2);

    const Decipher = crypto.createDecipheriv(algo, Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
    Decipher.setAuthTag(Buffer.from(auth, "hex"));

    return Decipher.update(encrypted_plaintext, "hex", "utf8") + Decipher.final("utf8");
}