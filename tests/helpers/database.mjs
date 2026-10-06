import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../../api/_db.js';
export async function testDatabase() {
  const db = new PGlite();
  const adapt = pg => {
    const sql = async (strings, ...values) => (await pg.query(strings.reduce((text,s,i)=>text+(i?'$'+i:'')+s,''),values)).rows;
    sql.json = value => JSON.stringify(value);
    sql.begin = fn => pg.transaction(tx => fn(adapt(tx)));
    return sql;
  };
  const sql=adapt(db);await migrate(sql);return {db,sql};
}
export async function call(handler, body) {
  let status=200,result;
  const res={set statusCode(s){status=s;},setHeader(){},end(text){result=JSON.parse(text);}};
  await handler({method:'POST',url:'/api/test',body},res);
  return {status,body:result};
}
