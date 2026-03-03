import subprocess
import sys
import os
import requests
import m3u8
import concurrent.futures
from urllib.parse import urljoin
from tqdm import tqdm
import re

# Verificação e instalação de dependências
REQUIRED_PACKAGES = ["m3u8", "requests", "tqdm"]

def install_missing_packages():
    """Verifica e instala pacotes Python ausentes."""
    for package in REQUIRED_PACKAGES:
        try:
            __import__(package)
        except ImportError:
            print(f"[🔧] Instalando pacote: {package}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", package])

install_missing_packages()

# 📂 Configurações
TEMP_FOLDER = "temp_segments"
# ATUALIZADO: Nova pasta para o projeto Marvel
COURSE_FOLDER = "Bônus - Seleção de personagens Marvel" 

# 📚 ATUALIZADO: Lista de vídeos para baixar do projeto Marvel
VIDEOS_TO_DOWNLOAD = {
    "Bônus - Seleção de personagens Marvel - HTML": "https://b-vz-77c52f03-dc6.tv.pandavideo.com.br/dfa8d61e-9849-4b82-a9e3-690f191dadb0/playlist.m3u8",
    "Bônus - Seleção de personagens Marvel - CSS": "https://b-vz-77c52f03-dc6.tv.pandavideo.com.br/82ff9036-0283-48f2-b645-895f31968971/playlist.m3u8",
    "Bônus - Seleção de personagens Marvel - Finalizando com JS": "https://b-vz-77c52f03-dc6.tv.pandavideo.com.br/b6923adb-ac93-4f83-9b28-fc764fa93986/playlist.m3u8"
}

def sanitize_filename(name):
    """Remove caracteres inválidos de nomes de arquivos."""
    # Remove o prefixo comum para deixar o nome do arquivo mais limpo
    name = name.replace("Bônus - Projetos dos eventos passados - ", "")
    return re.sub(r'[\\/*?:"<>|]', "", name)

def download_m3u8(url):
    """Baixa a playlist .m3u8."""
    print(f"[INFO] Baixando playlist .m3u8 de: {url}")
    r = requests.get(url)
    r.raise_for_status()
    return m3u8.loads(r.text), url

def download_segment(segment_url, segment_index):
    """Baixa um único segmento de vídeo."""
    local_filename = os.path.join(TEMP_FOLDER, f"seg_{segment_index:05d}.ts")
    try:
        r = requests.get(segment_url, stream=True, timeout=20)
        r.raise_for_status()
        with open(local_filename, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        return local_filename
    except Exception as e:
        print(f"[ERRO] Falha no segmento {segment_index}: {e}")
        return None

def merge_segments(segment_files, output_file):
    """Une os segmentos de vídeo em um único arquivo MP4."""
    print(f"[INFO] Unindo {len(segment_files)} segmentos em {output_file}")
    with open(output_file, 'wb') as outfile:
        for file in tqdm(segment_files, desc="Unindo segmentos"):
            with open(file, 'rb') as seg:
                outfile.write(seg.read())

def clean_temp_files(segment_files):
    """Limpa os arquivos de segmento temporários."""
    print(f"[INFO] Limpando arquivos temporários...")
    for file in segment_files:
        if os.path.exists(file):
            os.remove(file)
    if os.path.exists(TEMP_FOLDER):
        try:
            os.rmdir(TEMP_FOLDER)
        except OSError as e:
            print(f"[AVISO] Não foi possível remover a pasta temporária: {e}")


def escolher_melhor_resolucao(playlist):
    """Escolhe a melhor resolução disponível (>= 720p)."""
    resolucoes = [p for p in playlist.playlists if p.stream_info.resolution and p.stream_info.resolution[1] >= 720]
    if not resolucoes:
        # Se não houver >= 720p, pega a melhor disponível
        resolucoes = sorted(playlist.playlists, key=lambda p: p.stream_info.resolution[1], reverse=True)

    melhor = resolucoes[0]
    print(f"[AUTO] Selecionada resolução: {melhor.stream_info.resolution}")
    return melhor.uri

def main():
    """Função principal para orquestrar o download dos vídeos."""
    print(f"🎬 Iniciando download em lote do projeto: {COURSE_FOLDER}")
    os.makedirs(COURSE_FOLDER, exist_ok=True)

    for title, m3u8_url in VIDEOS_TO_DOWNLOAD.items():
        clean_title = sanitize_filename(title)
        
        print(f"\n{'='*60}")
        print(f"▶️  Processando aula: {clean_title}")
        print(f"{'='*60}")

        output_file = os.path.join(COURSE_FOLDER, f"{clean_title}.mp4")
        
        if os.path.exists(output_file):
            print(f"[AVISO] Arquivo '{output_file}' já existe. Pulando para o próximo.")
            continue

        os.makedirs(TEMP_FOLDER, exist_ok=True)
        
        segment_files = [] 
        try:
            playlist, base_url = download_m3u8(m3u8_url)

            if playlist.is_variant:
                variant_uri = escolher_melhor_resolucao(playlist)
                variant_url = urljoin(base_url, variant_uri)
                playlist, base_url = download_m3u8(variant_url)

            segment_urls = [urljoin(base_url, seg.uri) for seg in playlist.segments]
            print(f"[INFO] Total de segmentos: {len(segment_urls)}")

            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = {executor.submit(download_segment, url, idx): idx for idx, url in enumerate(segment_urls)}
                for f in tqdm(concurrent.futures.as_completed(futures), total=len(futures), desc="Baixando segmentos"):
                    result = f.result()
                    if result:
                        segment_files.append(result)

            if len(segment_files) != len(segment_urls):
                print("[ERRO] Nem todos os segmentos foram baixados com sucesso. Abortando o processo para este vídeo.")
                continue

            segment_files.sort()
            merge_segments(segment_files, output_file)
            
            print(f"✅ Aula '{clean_title}' baixada com sucesso!")
            print(f"📍 Salvo em: {output_file}")

        except Exception as e:
            print(f"[ERRO GERAL] Não foi possível processar o vídeo '{clean_title}'. Erro: {e}")
        
        finally:
            clean_temp_files(segment_files)


    print(f"\n🎉 Processo concluído. Verifique a pasta '{COURSE_FOLDER}' para encontrar seus vídeos.")

if __name__ == "__main__":
    main()