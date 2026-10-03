"""Convert art master PNGs into the WebP files the game loads.

Masters live in art-src/<category>/ (large PNGs from an illustrator or an AI
tool); the game loads assets/<category>/<name>.webp. Sizes and file limits
follow the art brief (rechao 美術需求書, 技術規格):

    python tools/build_assets.py                 # art-src -> assets
    python tools/build_assets.py --check         # report only, write nothing
    python tools/build_assets.py --src DIR --out DIR

Needs Python 3.9+ and Pillow with WebP support (pip install Pillow).
Exits with status 1 when any file breaks a rule, so it can run in CI later.
"""
import argparse
import io
import re
import sys
from pathlib import Path

from PIL import Image, features

# (filename pattern, output box in px, game file limit in KB, needs transparency)
RULES = [
    (r"^food-", (256, 256), 40, True),
    (r"^dish-.+-wok-\d+", (256, 256), 40, True),
    (r"^dish-.+-burned", (256, 256), 40, True),
    (r"^dish-", (1024, 1024), 300, True),
    (r"^chef-", (256, 384), 40, True),
    (r"^portrait-", (720, 840), 150, True),
    (r"^closeup-.+-bg(-|$)", (2320, 1800), 400, False),
    (r"^closeup-", (1024, 1024), 200, True),
]
NAME = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
QUALITIES = (85, 78, 70, 62, 55)
EDGE_MARGIN = 0.02  # subjects should leave a clean transparent border


def rule_for(stem):
    for pattern, box, limit, alpha in RULES:
        if re.search(pattern, stem):
            return box, limit, alpha
    return None


def encode(image, limit_kb):
    """Smallest quality step that fits the limit, else the last attempt."""
    for quality in QUALITIES:
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=quality, method=6)
        if buffer.tell() <= limit_kb * 1024:
            return buffer.getvalue(), quality, True
    return buffer.getvalue(), quality, False


def build(master, out_dir, check_only):
    errors, warnings = [], []
    stem = master.stem
    if not NAME.match(stem):
        errors.append("檔名要用小寫英文、數字和連字號")
    rule = rule_for(stem)
    if not rule:
        return errors + ["檔名前綴不在規則內（food-、dish-、chef-、portrait-、closeup-）"], warnings, None
    box, limit_kb, needs_alpha = rule

    image = Image.open(master)
    width, height = image.size
    if width < box[0] and height < box[1]:
        warnings.append(f"母檔 {width}×{height} 小於最小尺寸 {box[0]}×{box[1]}，不會放大")
    if abs(width / height - box[0] / box[1]) > 0.02:
        warnings.append(f"長寬比 {width}×{height} 和規格 {box[0]}×{box[1]} 不同，會等比縮放")

    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    image = image.convert("RGBA" if has_alpha else "RGB")
    if needs_alpha:
        if not has_alpha:
            errors.append("需要透明背景，但母檔沒有透明通道")
        else:
            bbox = image.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
            if not bbox:
                errors.append("整張都是透明的")
            elif min(bbox[0], bbox[1], width - bbox[2], height - bbox[3]) < EDGE_MARGIN * min(width, height):
                warnings.append("主體貼近畫布邊緣，四周要留透明邊")

    scale = min(box[0] / width, box[1] / height, 1)
    size = (round(width * scale), round(height * scale))
    if size != (width, height):
        image = image.resize(size, Image.LANCZOS)
    data, quality, fits = encode(image, limit_kb)
    if not fits:
        errors.append(f"最低畫質仍有 {-(-len(data) // 1024)} KB，超過上限 {limit_kb} KB")

    target = out_dir / master.parent.name / f"{stem}.webp"
    if not check_only and not errors:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    summary = f"{size[0]}×{size[1]}  {-(-len(data) // 1024)} KB / {limit_kb} KB  畫質 {quality}"
    return errors, warnings, summary


def main(argv=None):
    parser = argparse.ArgumentParser(description="把美術母檔轉成遊戲用的 WebP")
    parser.add_argument("--src", default="art-src", help="母檔資料夾（預設 art-src）")
    parser.add_argument("--out", default="assets", help="輸出資料夾（預設 assets）")
    parser.add_argument("--check", action="store_true", help="只檢查，不寫檔")
    args = parser.parse_args(argv)
    # Windows consoles may not default to UTF-8; the report is in Chinese.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    if not features.check("webp"):
        print("這個 Pillow 不支援 WebP，請更新：pip install -U Pillow")
        return 1
    src, out = Path(args.src), Path(args.out)
    masters = sorted(p for p in src.glob("*/*.png"))
    if not masters:
        print(f"{src} 底下沒有母檔（格式：{src}/<類別>/<檔名>.png）")
        return 1

    failed = 0
    for master in masters:
        errors, warnings, summary = build(master, out, args.check)
        status = "失敗" if errors else "注意" if warnings else "完成"
        print(f"[{status}] {master.parent.name}/{master.name}" + (f"  →  {summary}" if summary else ""))
        for message in errors:
            print(f"    錯誤：{message}")
        for message in warnings:
            print(f"    提醒：{message}")
        failed += bool(errors)
    print(f"\n共 {len(masters)} 張，{failed} 張失敗" + ("（只檢查，未寫檔）" if args.check else ""))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
