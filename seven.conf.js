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
       cron:false
     },
     pushbullet:{
       apikey:process.env.pbulletapikey,
       devices:['browser'],
       cron:false
     },
     slack:{
       apikey:process.env.slackapikey,
       channels:['general'],
       cron:false
     }
}
