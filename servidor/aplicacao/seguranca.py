"""
Módulo de Segurança, Criptografia de Palavras-passe e Emissão de Tokens.
Utiliza exclusivamente a biblioteca padrão do Python (hashlib, hmac, secrets).
"""

import hashlib
import secrets
import json
import hmac
import time
import base64
from typing import Optional, Dict, Any

CHAVE_SECRETA_SESSAO = "binov-fitness-secret-key-2026-adaptative-super-safe"


def gerar_hash_senha(senha: str) -> str:
    """Gera hash criptográfico seguro PBKDF2-HMAC-SHA256 com salt aleatório."""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${hash_obj.hex()}"


def verificar_senha(senha: str, hash_completo: str) -> bool:
    """Compara a senha em texto plano com o hash PBKDF2 de forma imune a timing attacks."""
    try:
        if not hash_completo or "$" not in hash_completo:
            return False
        salt, hash_esperado = hash_completo.split("$", 1)
        hash_calculado = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
        return hmac.compare_digest(hash_calculado, hash_esperado)
    except Exception:
        return False


def criar_token_acesso(dados: Dict[str, Any], duracao_dias: int = 30) -> str:
    """Gera um token de acesso assinado via HMAC-SHA256 válido por duracao_dias."""
    payload = {
        **dados,
        "exp": int(time.time()) + (duracao_dias * 24 * 3600)
    }
    payload_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    assinatura = hmac.new(CHAVE_SECRETA_SESSAO.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{assinatura}"


def decifrar_token_acesso(token: str) -> Optional[Dict[str, Any]]:
    """Valida a assinatura criptográfica e expiração do token."""
    try:
        if not token or "." not in token:
            return None
        payload_b64, assinatura = token.split(".", 1)
        assinatura_esperada = hmac.new(CHAVE_SECRETA_SESSAO.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(assinatura, assinatura_esperada):
            return None

        # Adicionar padding base64 se necessário
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)

        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        payload = json.loads(payload_bytes.decode("utf-8"))

        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None
