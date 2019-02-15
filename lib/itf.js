const { Readable } = require('stream');

exports = module.exports = itf;
exports.contentType = 'application/octet-stream';
exports.extension = 'itf';

/*
ITF file format

see: https://developers.sygic.com/documentation.php?action=navifiles_ITF

Header (4 + 4 + 2 + 2 = 12 bytes)

00 UInt32 Time  Creation time - count of seconds snce 1.1.2001
04 UInt32 Empty
08 UInt16 Visited Index short int 2 bytes Index of last visited point in itinerary
10 UInt16 Count of points unsigned short int  2 bytes Count of points in itinerary file

Point (4 + 4 + 1 + 1 + 2 + (strlen + 1) * 2 = 12 bytes + (strlen + 1) * 2
00 UInt32     Longitude in degrees x 100 000
04 UInt32     Latitude  in degrees x 100 000
08 UInt8      Type  Via Point = 1, Finish = 2, Start = 3, Invisible = 4.
09 UInt8      Empty
10 UInt16     Length of Point name in bytes ( wcslen(Name) + 1 ) * sizeof(wchar_t)
12 wchar_t[]  Name of point. Unicode null terminated string.
*/

function toCoord(f) {
  return Math.round(f * 1e5);
}

const REF_TIME = new Date('2001-01-01').getTime();

function time() {
  return Math.round((Date.now() - REF_TIME) / 1000);
}

function header(count) {
  const b = Buffer.allocUnsafe(12);
  b.writeUInt32LE(time(), 0);
  b.writeUInt32LE(0, 4);      // empty
  b.writeUInt16LE(0, 8);      // visited
  b.writeUInt16LE(count, 10);

  return b;
}

// FIXME: get proper point type
function step2record({ name, coordinates }, type = 1) {

  const headerLen = 12;
  const nameLen = name.length * 2;
  const len = headerLen + nameLen + 2;

  const b = Buffer.allocUnsafe(len);

  b.writeInt32LE(toCoord(coordinates.lon), 0);
  b.writeInt32LE(toCoord(coordinates.lat), 4);

  b.writeUInt8(type, 8);
  b.writeUInt8(0, 9); // empty

  b.writeUInt16LE(nameLen + 2, 10);

  // HACK: this does not properly take into account 4 byte characters
  b.write(name, headerLen, nameLen + 2, 'ucs2');

  // 0 terminated
  b.writeUInt16LE(0, len - 2);

  return b;
}

function isValid(step) {
  return step.coordinates;
}

function itf(out, options) {
  const steps = options.routes[0].points;

  const count = steps.length;
  let currentLine = 0;

  const stream = new Readable({
    read() {

      if (currentLine === 0) {
        this.push(header(count));
      }

      while (currentLine < count) {
        let step = steps[currentLine++];
        if (!isValid(step)) {
          continue;
        }
        if (!this.push(step2record(step))) {
          break;
        }
      }

      if (currentLine >= steps.length) {
        this.push(null);
      }
    }
  });

  return stream.pipe(out);
}
