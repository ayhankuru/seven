module.exports = {
     appname:'Foobar',
     template:{
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
       devices:['browser']
     },
     slack:{
       apikey:process.env.slackapikey,
       channels:['general'],
       cron:false
     }
}
