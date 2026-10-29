"""
Script de Inicialização do Servidor FastAPI.
Executar com: python iniciar_servidor.py
"""

import sys
import uvicorn

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    print("[SERVIDOR] A iniciar Servidor FastAPI em http://localhost:8000")
    print("[SWAGGER]  Documentacao interativa disponivel em http://localhost:8000/docs")
    uvicorn.run("aplicacao.principal:app", host="0.0.0.0", port=8000, reload=True)
