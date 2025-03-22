// Simple client-side encryption/decryption utilities
// Note: This is NOT secure cryptography, just basic obfuscation
// to avoid storing plaintext passwords in sessionStorage

// Encrypt a string and return a Base64 encoded result
export const encrypt = (plaintext: string): string => {
  if (typeof window === 'undefined') {
    // Server-side fallback (not ideal, but better than crashing)
    return Buffer.from(plaintext).toString('base64');
  }
  
  try {
    // Simple XOR-based obfuscation with a session-based key
    const key = sessionStorage.getItem('_k') || Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem('_k', key);
    
    let result = '';
    for (let i = 0; i < plaintext.length; i++) {
      const charCode = plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return btoa(result);
  } catch (error) {
    console.error('Basic encryption error:', error);
    // Fallback to simple base64 encoding if everything else fails
    return btoa(plaintext);
  }
};

// Decrypt a Base64 encoded encrypted string
export const decrypt = (ciphertext: string): string => {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return Buffer.from(ciphertext, 'base64').toString();
  }
  
  try {
    const key = sessionStorage.getItem('_k');
    if (!key) {
      throw new Error('Encryption key not found');
    }
    
    const decoded = atob(ciphertext);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return result;
  } catch (error) {
    console.error('Basic decryption error:', error);
    // Fallback
    return atob(ciphertext);
  }
}; 