/**
 * Maze
 *	迷路ゲーム
 */

enchant();	//おまじない

//グローバル変数(ほぼ定数と同じ意味で書いています。)
var SCREEN_WIDTH    = 320;	//画面幅	9leapに合わせた幅
var SCREEN_HEIGHT   = 320;	//画面高さ 9leapに合わせた高さ
var FRAME_RATE      = 24;	//フレームレート ブラウザゲーなのでこれだけ出てれば十分かなと

//ゲーム特有の定数
var CELL_WIDTH		= 16;	//1マスの幅
var CELL_HEIGHT		= 16;	//1マスの高さ
var MAP_MAX_COL		= 39;	//横のマス数
var MAP_MAX_ROW		= 39;	//縦のマス数
//各タイル番号
var TILE_GROUND		= 0;
var TILE_WALL		= 3;
var TILE_WALL_EDGE	= 4;
var TILE_GOAL		= 25;	//ゴールのタイル番号

//assets path	imgフォルダ内に置くこと
var IMAGE_PATH_CHARA_0	= "img/chara0.png";
var IMAGE_PATH_MAP_0	= "img/map0.png";

window.onload = function(){

	game = new Core(SCREEN_WIDTH, SCREEN_HEIGHT);
	game.fps = FRAME_RATE;
	game.preload(
		IMAGE_PATH_CHARA_0,
		IMAGE_PATH_MAP_0
	);
	
	/**
	 * 乱数の取得
	 *	param	n	乱数の数
	 *	return	0 ～ n-1 のどれか
	 */
	function getRandValue(n){
		return Math.floor(Math.random()*n);
	};
	
	
	/**
	 * 操作キャラクター
	 */
	 var Player = Class.create(Group, {
		initialize: function(){
			Group.call(this);
			
			//向き
			this.eDirection = {
				front:	0,
				left:	1,
				right:	2,
				back:	3,
			};
			
			//移動状態
			this.eMoveStatus = {
				stop:	0,
				walk:	1,
			};
			
			this.width	= CELL_WIDTH	* MAP_MAX_COL;
			this.height	= CELL_HEIGHT	* MAP_MAX_ROW;
			
			this.x = 16;
			this.y = 16;
			this.speed = 4;
			this.direction = this.eDirection.down;
			this.moveStatus = this.eMoveStatus.stop;
			this.walkTime = 0;
			this.walkFrameList = [0, 1, 2, 1];
			
			//画像
			this.sprite = new Sprite(CELL_WIDTH*2, CELL_HEIGHT*2);
			this.sprite.image = game.assets[IMAGE_PATH_CHARA_0];
			this.sprite.moveTo(-8, -16);
			this.sprite.leftSpace = 4;
			this.sprite.rightSpace = 4;
			this.sprite.topSpace = 6;
			this.sprite.bottomSpace = 2;
			
			this.addChild(this.sprite);
		},
		/**
		 * 更新処理 外部から毎フレーム呼び出す
		 *	param	map	マップ
		 */
		update: function(map){
			//速度決定
			var vx = 0;
			var vy = 0;
			if(game.input.left === true){
				vx = -this.speed;
				this.direction = this.eDirection.left;
				this.moveStatus = this.eMoveStatus.walk;
			} else if(game.input.right === true){
				vx = this.speed;
				this.direction = this.eDirection.right;
				this.moveStatus = this.eMoveStatus.walk;
			} else if(game.input.up === true){
				vy = -this.speed;
				this.direction = this.eDirection.back;
				this.moveStatus = this.eMoveStatus.walk;
			} else if(game.input.down === true){
				vy = this.speed;
				this.direction = this.eDirection.front;
				this.moveStatus = this.eMoveStatus.walk;
			} else {
				this.moveStatus = this.eMoveStatus.stop;
			}
			
			//当たり判定
			var dLeft	= this.left		+ vx;
			var dRight	= this.right	+ vx;
			var dTop	= this.top		+ vy;
			var dBottom	= this.bottom	+ vy;
			if((map.hitTest(dLeft,	dTop	) === false)	//左上
			&& (map.hitTest(dRight,	dTop	) === false)	//右上
			&& (map.hitTest(dLeft,	dBottom	) === false)	//左下
			&& (map.hitTest(dRight,	dBottom	) === false)	//右下
			){
				this.x += vx;
				this.y += vy;
			}
			
			//画像入れ替え
			var frame = this.direction * 9;
			if(this.moveStatus === this.eMoveStatus.walk){
				this.walkTime++;
				var index = Math.floor(this.walkTime/4)%4;
				frame += this.walkFrameList[index];
			} else {
				frame += 1;
			}
			this.sprite.frame = frame;
		},
		/**
		 * 特定のマップに接触しているか
		 *	param	map		マップ
		 *	param	tileNo	検索するマップのタイル番号
		 *	return	特定のマップに接触しているか
		 */
		isCollisionTile: function(map, tileNo){
		
			if((map.checkTile(this.left,	this.top	) === tileNo)	//左上
			|| (map.checkTile(this.right,	this.top	) === tileNo)	//右上
			|| (map.checkTile(this.left,	this.bottom	) === tileNo)	//左下
			|| (map.checkTile(this.right,	this.bottom	) === tileNo)	//右下
			){
				return true;
			} else {
				return false;
			}
		},
		//辺の座標
		left:	{
			get: function(){
				return this.x + this.sprite.leftSpace;
			}
		},
		right:	{
			get: function(){
				return this.x + CELL_WIDTH - this.sprite.rightSpace - 1;
			}
		},
		top:	{
			get: function(){
				return this.y + this.sprite.topSpace;
			}
		},
		bottom:	{
			get: function(){
				return this.y + CELL_HEIGHT - this.sprite.bottomSpace - 1;
			}
		},
	 });
	
	/**
	 * 迷路クラス
	 */
	 var Maze = Class.create(Group, {
		initialize: function(mapData){
			Group.call(this);
			
			this.player	= new Player();
			
			this.map = new Map(CELL_WIDTH, CELL_HEIGHT);
			this.map.image = game.assets[IMAGE_PATH_MAP_0];
			this.createMap();
			
			this.addChild(this.map);
			this.addChild(this.player);
			
		},
		//ステージ生成
		createMap: function(){
			//当たり判定用の配列初期化
			var collision = new Array(MAP_MAX_ROW);
			for(var i=0; i<MAP_MAX_ROW; i++){
				collision[i] = new Array(MAP_MAX_COL);
				for(var j=0; j<MAP_MAX_COL; j++){
					collision[i][j] = 0;
				}
			}
			//マップの生成(当たり判定箇所のみ)
			for(var i=0; i<MAP_MAX_ROW; i++){
				for(var j=0; j<MAP_MAX_COL; j++){
					if((i === 0) || (i === MAP_MAX_ROW - 1)
					|| (j === 0) || (j === MAP_MAX_COL - 1)){
						//一番外枠は当たり判定を付ける
						collision[i][j] = 1;
					} else {
						if((i%2 === 0) && (j%2 === 0)){
							collision[i][j] = 1;

							while(1){
								var rnd;
								if(i === 2){
									rnd = getRandValue(4);
								} else {
									rnd = getRandValue(3) + 1;
								}
								var n_i = i;
								var n_j = j;

								switch(rnd){
									case 0:	n_i = i - 1; break;	//上
									case 1:	n_j = j - 1; break;	//左
									case 2:	n_i = i + 1; break;	//下
									case 3:	n_j = j + 1; break;	//右
								}

								if(collision[n_i][n_j] === 0){
									collision[n_i][n_j] = 1;
									break;
								} else {
									continue;
								}
							}
						} else {
							if(collision[i][j] === 1){
								collision[i][j] = 1;
							} else {
								collision[i][j] = 0;
							}
						}
					}
				}
			}

			//画像マップをセット
			var stage = new Array(MAP_MAX_ROW);
			for(var i=0; i<MAP_MAX_ROW; i++){
				stage[i] = new Array(MAP_MAX_COL);
				for(var j=0; j<MAP_MAX_COL; j++){
					if(i === MAP_MAX_ROW - 1){
						//一番下の段は端っこの画像
						stage[i][j] = TILE_WALL_EDGE;
					} else {
						if(collision[i][j] === 1){
							if(collision[i+1][j] === 0){
								//1つ下に壁が無ければ端っこの画像
								stage[i][j] = TILE_WALL_EDGE;
							} else {
								stage[i][j] = TILE_WALL;
							}
						} else {
							stage[i][j] = TILE_GROUND;
						}
					}
				}
			}
			
			stage[MAP_MAX_ROW-2][MAP_MAX_COL-2] = TILE_GOAL;	//ゴールだけ個別に
			
			this.map.loadData(stage);
			this.map.collisionData = collision;
		},
		onenterframe: function(){
			this.player.update(this.map);
			this.scroll();
			
			if(this.isComplete() === true){
				var time = Math.floor(game.frame / game.fps);
				var message = time + "秒でゴールしました";
				var score = 10000 - game.frame;
				score = (score < 0) ? (0) : (score);

				game.end(score, message);
			}
		},
		//画面のスクロール
		scroll: function(){
			if(this.player.x >= (game.width/2)){
				this.x = (game.width/2) - this.player.x;
			}
			if(this.x <= (game.width-this.map.width)){
				this.x = game.width-this.map.width;
			}
			if(this.player.y >= (game.height/2)){
				this.y = (game.height/2) - this.player.y;
			}
			if(this.y <= (game.height-this.map.height)){
				this.y = game.height-this.map.height;
			}
		},
		//クリア判定
		isComplete: function(){
			return this.player.isCollisionTile(this.map, TILE_GOAL);
		}
	 });
	
	/**
	 * メイン処理
	 */
	game.onload = function(){
		game.rootScene.backgroundColor = "black";
	
		game.rootScene.addChild(new Maze());
		
		game.pad = new Pad();
		game.pad.moveTo(0, 200);
		game.rootScene.addChild(game.pad);
		
		game.on("enterframe", function(){
		});
	};
	
	game.start();
};
