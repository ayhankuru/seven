module.exports = {
     appname:'Foobar',
     template:{
       path:__dirname+'/template/hero.tmp',
       params:{
         title:`Uygulamada hata oluştu : {appname} `,
         year:new Date().getFullYear(),
         author:'ayhankuru'
       }
     },
     email:{
       transport:{
         service: 'Gmail',
         auth: {
             user: process.env.xgmailname,
             pass: process.env.xgmailpass
         }
       },
       list:['cobaimelan@gmail.com','cobaimelan@yandex.com.tr'],
        cron:'30 minute'
     },
     pushbullet:{
       apikey:process.env.pbulletapikey,
       devices:['browser'],
        cron:'20 minute'
     },
     slack:{
       apikey:process.env.slackapikey,
       channels:['general'],
       cron:'10 minute'
     }
}
