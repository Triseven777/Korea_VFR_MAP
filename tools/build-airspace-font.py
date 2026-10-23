from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import distance_transform_edt
BASE=Path(__file__).resolve().parents[1]
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24)
def varint(n):
 b=bytearray()
 while n>127:b.append((n&127)|128);n>>=7
 b.append(n);return bytes(b)
def uint(field,n):return varint(field<<3)+varint(n)
def sint(field,n):return uint(field,(n<<1)^(n>>31))
def blob(field,data):return varint((field<<3)|2)+varint(len(data))+data
for start in [0,8192]:
 glyphs=[]
 for code in range(start,start+256):
  if code<32 or 127<=code<160:continue
  ch=chr(code);box=FONT.getbbox(ch,anchor='ls');left,top,right,bottom=box;w,h=right-left,bottom-top
  bitmap=b''
  if w and h:
   img=Image.new('L',(w+6,h+6));ImageDraw.Draw(img).text((3-left,3-top),ch,font=FONT,fill=255,anchor='ls')
   mask=np.asarray(img)>127
   sdf=distance_transform_edt(mask)-distance_transform_edt(~mask)
   bitmap=np.clip(192+sdf*32,0,255).astype('uint8').tobytes()
  glyph=uint(1,code)+blob(2,bitmap)+uint(3,w)+uint(4,h)+sint(5,left)+sint(6,-top)+uint(7,round(FONT.getlength(ch)))
  glyphs.append(blob(3,glyph))
 stack=blob(1,b'AirspaceSans')+blob(2,f'{start}-{start+255}'.encode())+b''.join(glyphs)
 (BASE/'data/fonts/AirspaceSans'/f'{start}-{start+255}.pbf').write_bytes(blob(1,stack))
