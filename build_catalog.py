"""Build hosted catalogue and standalone offline ZIP from the source registry/assets."""
from pathlib import Path
from PIL import Image
import json,base64,io,zipfile,copy
ROOT=Path(__file__).resolve().parent;D=ROOT;A=D/'assets';T=A/'thumbs';T.mkdir(exist_ok=True)
base=json.loads((ROOT/'catalog-source.json').read_text())
def enc(im,size,quality=80):
 im=im.copy().convert('RGB');im.thumbnail(size);b=io.BytesIO();im.save(b,'JPEG',quality=quality,optimize=True);return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
def thumbnail(path,dest,size,q=80):
 im=Image.open(path).convert('RGB');im.thumbnail(size);im.save(dest,quality=q,optimize=True)
for p in base['pages']:
 thumbnail(D/p['image'],T/(p['id']+'.jpg'),(260,260),72);p['thumbnail']='assets/thumbs/'+p['id']+'.jpg'
for r in base['stamps']:
 thumbnail(D/r['large_image'],T/(r['id']+'.jpg'),(320,320));r['image']='assets/thumbs/'+r['id']+'.jpg'
base['offline']=False
(D/'catalog.json').write_text(json.dumps(base,ensure_ascii=False,indent=2))
template=(ROOT/'template.html').read_text().replace('.album-map>img{max-height:660px;object-fit:contain}', '.album-map>img{height:auto}')
script=(ROOT/'app.js').read_text()
def html(data):return template.replace('__CATALOG__',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')).replace('<script src="app.js"></script>','<script>'+script.replace('</script','<\\/script')+'</script>')
(D/'index.html').write_text(html(base))
offline=copy.deepcopy(base);offline['offline']=True
for p in offline['pages']:
 im=Image.open(D/p['image']);p['inline_image']=enc(im,(900,900),72);p['thumbnail']=enc(im,(260,260),72)
for r in offline['stamps']:
 r['inline_image']=enc(Image.open(D/r['large_image']),(320,320),74)
 r['original_inline_image']=enc(Image.open(D/r['original_image']),(300,300),72)
offhtml=html(offline)
# Keep standalone HTML outside the deployment (ZIP stays below the static per-file limit).
export=ROOT/'exports';export.mkdir(exist_ok=True)
(export/'Stamp_Catalogue.html').write_text(offhtml)
with zipfile.ZipFile(D/'catalogue-offline.zip','w',zipfile.ZIP_DEFLATED,9) as z:z.writestr('Stamp_Catalogue.html',offhtml)
print(json.dumps(dict(stamps=len(base['stamps']),pages=len(base['pages']),sources=len(base['sources']),priced=sum(r['low'] is not None and r['high'] is not None for r in base['stamps']),htmlMB=round((D/'index.html').stat().st_size/1e6,2),offlineZipMB=round((D/'catalogue-offline.zip').stat().st_size/1e6,2))))
