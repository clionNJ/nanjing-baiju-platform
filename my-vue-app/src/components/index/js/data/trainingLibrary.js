export const trainingLibrary = {
    baiju: {
        name: '白局',
        referenceHint: '示范音频为白局传统唱段，建议佩戴耳机聆听。',
        tracks: [
            {
                id: 'baiju-qinhuai',
                title: '白局《秦淮灯会》经典段',
                audio: 'https://cdn.pixabay.com/download/audio/2022/03/19/audio_7d1f8d4a4a.mp3?filename=jiangnan-melody-21051.mp3',
                tempo: 72,
                lyrics: [
                    {text: '秦淮河畔灯火明，', start: 0.0, end: 3.2},
                    {text: '游人如织喜盈盈。', start: 3.2, end: 6.2},
                    {text: '白局一曲传千古，', start: 6.2, end: 9.2},
                    {text: '文化传承永不停。', start: 9.2, end: 12.5}
                ],
                pitchContour: [
                    {time: 0.0, freq: 210},
                    {time: 1.5, freq: 233},
                    {time: 3.0, freq: 220},
                    {time: 4.5, freq: 247},
                    {time: 6.5, freq: 224},
                    {time: 8.5, freq: 216},
                    {time: 10.0, freq: 240},
                    {time: 12.0, freq: 215}
                ]
            },
            {
                id: 'baiju-modern',
                title: '白局《金陵四季》现代段',
                audio: 'https://cdn.pixabay.com/download/audio/2023/06/25/audio_0dbebc384d.mp3?filename=oriental-sunrise-14783.mp3',
                tempo: 76,
                lyrics: [
                    {text: '春到金陵花满枝，', start: 0.0, end: 2.8},
                    {text: '夏来秦淮夜更迟。', start: 2.8, end: 5.6},
                    {text: '秋风桂子飘城郭，', start: 5.6, end: 8.6},
                    {text: '冬雪银装映画时。', start: 8.6, end: 11.6}
                ],
                pitchContour: [
                    {time: 0.0, freq: 220},
                    {time: 1.2, freq: 246},
                    {time: 2.6, freq: 233},
                    {time: 4.2, freq: 255},
                    {time: 5.8, freq: 230},
                    {time: 7.4, freq: 218},
                    {time: 9.0, freq: 240},
                    {time: 10.8, freq: 226}
                ]
            }
        ]
    },
    yangju: {
        name: '扬剧',
        referenceHint: '扬剧唱腔韵味醇厚，可关注气息与圆腔。',
        tracks: [
            {
                id: 'yangju-lotus',
                title: '扬剧《荷塘月色》选段',
                audio: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_42d0c15d77.mp3?filename=beautiful-china-20989.mp3',
                tempo: 70,
                lyrics: [
                    {text: '荷塘月色映明波，', start: 0.0, end: 3.0},
                    {text: '风送花香绕翠荷。', start: 3.0, end: 6.2},
                    {text: '一腔柔情倾江畔，', start: 6.2, end: 9.4},
                    {text: '声随浪影到婆娑。', start: 9.4, end: 12.6}
                ],
                pitchContour: [
                    {time: 0.0, freq: 205},
                    {time: 1.5, freq: 220},
                    {time: 3.0, freq: 238},
                    {time: 4.5, freq: 225},
                    {time: 6.5, freq: 244},
                    {time: 8.5, freq: 230},
                    {time: 10.5, freq: 218},
                    {time: 12.0, freq: 208}
                ]
            }
        ]
    },
    kunqu: {
        name: '昆曲',
        referenceHint: '昆曲讲究水磨腔，请把握滑音与行腔流动。',
        tracks: [
            {
                id: 'kunqu-youyuan',
                title: '昆曲《游园》水磨腔',
                audio: 'https://cdn.pixabay.com/download/audio/2023/01/18/audio_0b0333bc86.mp3?filename=oriental-dream-13438.mp3',
                tempo: 64,
                lyrics: [
                    {text: '花影轻摇窗影斜，', start: 0.0, end: 3.4},
                    {text: '笙箫声里燕穿花。', start: 3.4, end: 6.4},
                    {text: '水磨腔转回风细，', start: 6.4, end: 9.8},
                    {text: '一笑低回叹韶华。', start: 9.8, end: 13.0}
                ],
                pitchContour: [
                    {time: 0.0, freq: 240},
                    {time: 1.6, freq: 256},
                    {time: 3.2, freq: 245},
                    {time: 4.8, freq: 270},
                    {time: 6.8, freq: 250},
                    {time: 8.8, freq: 238},
                    {time: 10.8, freq: 262},
                    {time: 12.6, freq: 242}
                ]
            }
        ]
    },
    pingtan: {
        name: '评弹',
        referenceHint: '评弹注重吐字行腔，可配合琵琶节奏细听。',
        tracks: [
            {
                id: 'pingtan-jianghai',
                title: '评弹《江海情》评话',
                audio: 'https://cdn.pixabay.com/download/audio/2023/02/21/audio_065b1e971e.mp3?filename=silk-road-13674.mp3',
                tempo: 66,
                lyrics: [
                    {text: '江涛拍岸月如钩，', start: 0.0, end: 3.0},
                    {text: '吟来旧梦意悠悠。', start: 3.0, end: 6.0},
                    {text: '吴侬软语传千里，', start: 6.0, end: 9.2},
                    {text: '细说江南一叶舟。', start: 9.2, end: 12.5}
                ],
                pitchContour: [
                    {time: 0.0, freq: 190},
                    {time: 1.5, freq: 208},
                    {time: 3.0, freq: 198},
                    {time: 4.5, freq: 215},
                    {time: 6.5, freq: 200},
                    {time: 8.5, freq: 194},
                    {time: 10.5, freq: 210},
                    {time: 12.0, freq: 196}
                ]
            }
        ]
    }
};


