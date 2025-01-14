// given an array, get the value at the given index. if the index is larger than
// the array, return the last element

export default function getValue (arr, index) {
  if (arr.length === 0) {
    console.log('ERROR: array length is zero')
    return null
  }
  
  if (index >= arr.length)
    return arr[arr.length-1]

  return arr[index]
}
