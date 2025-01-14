export default {
  // the default random seed that will be used when this design file is first used in a program run.
  // enabling this line will result in the same random numbers used each time, making random levels reproducible

  // weird tunnel overlap with prefab room caused by something in _mergeTunnels()
  //randSeed: 0.7956894984385063

  //randSeed: 0.05407006067002862

  // produces very nice looking level, harcode this to test with for now
  //randSeed: 0.9342698135762848,

  // dimensions of the level to create
  dimensions: {
    width : 350,
    height: 250
  },

  // initial "prefab" rooms
  // these rooms are special, in that they can't be tunneled into.
  // useful when you want to place predefined elements in an area.
  rooms: [
    {
      x: 20,
      y: 20,
      width: 13,
      height: 9,
      doors: [
        {
          x: 33,
          y: 26,
          width: 1,
          height: 1
        }
      ]
    },
    {
      x: 200,
      y: 100,
      width: 17,
      height: 13,
      doors: [
        {
          x: 199,
          y: 105,
          width: 1,
          height: 1
        }
      ]
    },
    {
      x: 90,
      y: 200,
      width: 7,
      height: 5,
      doors: [
        {
          x: 89,
          y: 202,
          width: 1,
          height: 1
        }
      ]
    }
  ],

  //  the following parameters are very important: Builders born in
  //  earlier generations will tend to dominate (fill) the map

  //  probabilities that a baby Roomie will be born after i generations
  //  indices above 10 are illegal, enter integer values for all 11 indices
  //       i =   0    1    2     3    4    5    6    7    8    9    10
  babyRoomie: [ 0,   0,   50,   50,  0,   0,   0,   0,   0,   0,   0 ],
  //  values must add up to 100


  babyTunnelers: {
    //  probabilities that a baby Tunneler will be born after i generations
    //  (applicable only for those Tunnelers who are not larger than their parents -
    //  - for those larger than their parents, use sizeUpGenDelay)
    //  indices above 10 are illegal, enter integer values for all 11 indices
    //                       i =   0    1    2      3    4    5    6    7    8    9    10
    generationBirthProbability: [ 0,   0,   100,   0,   0,   0,   0,   0,   0,   0,   0 ],
    //  values must add up to 100

    //  probabilities that a baby Tunneler of generation gen will have a tunnelWidth 2 size larger than its parent
    //  last value is repeated for further generations
    //            gen =   0   1    2    3   4   5     6     7    8   9   10  11 12 13 14 15 16 17 18 19 20
    sizeUpProbability: [ 0,  50,  50,  0,  0,  75,  75,  30 ],


    //  probabilities that a baby Tunneler of generation gen will have a tunnelWidth 2 size smaller than its parent
    //  last value is repeated for further generations
    //              gen =   0   1   2    3     4     5   6   7    8   9   10  11 12 13 14 15 16 17 18 19 20
    sizeDownProbability: [ 0,  0,  50,  100,  100,  0,  0,  70 ],

    //  for every generation, 100 - (sizeUpProb(gen) + sizeDownProb(gen) = probability that size remains the same,
    //  and this value must be >= 0
    //  in this example tunnels first get narrower, then rapidly larger in generation 5
    //  this ensures that larger tunnels are far from the entrance
    //  actually, the level is too small to let that happen
    //  after generation 6 there is a random element, tunnels can get larger or smaller

    // high values make the tunneler prefer to join another tunnel or open space
    // low values means it prefers to end its run by building a room
    // last value is repeated for further generations
    //            gen = 0   1   2    3     4
    joinProbability: [ 0,  0,  10,  100,  100 ]
  },


  //  probability that a Tunneler will make an anteroom when changing direction or spawning
  //      tunnelWidth =   0    1    2   3   4    5    6    7    8   ...
  anteroomProbability: [ 20,  30,  0,  0,  100 ],
  //  value 100 ends the input and repeats for larger tunnels
  //  here we have anterooms only on narrow tunnels
  //  these parameters are important for the appearance of the level

  roomSizes: {
    small: [ 20, 39 ],
    medium: [ 40, 79 ],
    large: [ 80, 150 ]
  },

  maxRooms: {
    small: 400,
    medium: 120,
    large: 16
  },


  //  probabilities to use a room of a certain size depending on tunnelWidth
  roomSizeProbability: {
    // rooms coming out sideways from the tunnel. index specifies tunnel width
    sideways: [
      {
        small: 100,
        medium: 0,
        large: 0
      },
      {
        small: 50,
        medium: 50,
        large: 0
      },
      {
        small: 0,
        medium: 100,
        large: 0
      },
      {
        small: 0,
        medium: 0,
        large: 100
      }
    ],
    // rooms at branching sites. index specifies tunnel width
    branching: [
      {
        small: 100,
        medium: 0,
        large: 0
      },
      {
        small: 0,
        medium: 100,
        large: 0
      },
      {
        small: 0,
        medium: 0,
        large: 100
      }
    ]
  },
  //  all probabilities should add up to 100 per tunnel width
  //  input ends when large is at 100, then repeats at 100% large rooms
  //  very important - use this to make sure that larger rooms are on larger tunnels


  //  maxSteps for generations of Tunneler. last value is repeated for further generations
  //             gen = 0   1    2    3    4    5    6    7    8    9    10   11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30
  tunnelerMaxSteps: [ 5,  12,  12,  15,  15,  15,  15,  15,  15,  20,  30,  10, 15, 10, 3,  20, 10, 5,  15, 10, 5,  20, 20, 20, 20, 10, 20, 5,  20, 5,  0 ],


  // changes Tunneler parameters between generations. less change with smaller mutator
  mutator: 20,

  // roomAspectRatio <= length/width and width/length of rooms must be larger than this
  roomAspectRatio: 0.4,

  // probability that 2 adacent rooms will be connected to each other via a door (0 is 0%, 1 is 100%)
  roomConnectionProbability: 0.4,

  // the normal generational delay is divided by this value to give the actual generational delay -
  // to prevent anterooms without tunnels branching off them, an ugly sight if too frequent
  //genSpeedUpOnAnteRoom: 4

  // the minimum amount of space required between rooms
  minRoomSpacing: 1,

  // "last-chance-Tunnelers" are created when a Tunneler runs out of room
  lastChanceTunneler: {
    makeRoomsLeftProb: 100,
    makeRoomsRightProb: 100,
    changeDirectionProb: 40,
    straightDoubleSpawnProb: 30,
    turnDoubleSpawnProb: 80,
    // high values make the tunneler prefer to join another tunnel or open space
    // low values it prefers to end its run by building a room
    joinProb: 50
  },

  // used for tunnelers that are created at room exits
  roomExitTunneler: {
    // tunneler will be deleted after having made at most maxSteps steps
    maxSteps: 12,
    // the generation this tunneler will be born
    generation: 0,
    // number of squares covered in one step
    stepLength: 7,
    tunnelWidth: 1,
    straightDoubleSpawnProb: 40,
    turnDoubleSpawnProb: 60,
    // probability that the tunneler changes direction at the end of one step
    changeDirectionProb: 40,
    makeRoomsRightProb: 100,
    makeRoomsLeftProb: 100,
    // high values make the tunneler prefer to join another tunnel or open space
    // low values it prefers to end its run by building a room
    joinProb: 50
  },


  tunnelers: [ ]
};
