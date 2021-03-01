const chai = require('chai');
const { expect } = chai;
chai.use(require('chai-bn')(web3.utils.BN));
const { getTokenBytecode, getBatchTokenBytecode } = require('1155-to-20-helper/src');

const Wrapped1155Factory = artifacts.require('Wrapped1155Factory');
const Wrapped1155 = artifacts.require('Wrapped1155');
const ConditionalTokens = artifacts.require('ConditionalTokens');
const ToyToken = artifacts.require('ToyToken');
const {
  getConditionId,
  getCollectionId,
  getPositionId,
} = require('@gnosis.pm/conditional-tokens-contracts/utils/id-helpers')(web3.utils);

contract('Wrapped1155Factory', function (accounts) {
  let wrapped1155Factory;
  let wrapped1155Impl;
  let conditionalTokens;
  let toyToken;

  before('get contracts', async function () {
    wrapped1155Factory = await Wrapped1155Factory.deployed();
    wrapped1155Impl = await Wrapped1155.deployed();
    conditionalTokens = await ConditionalTokens.new();
    toyToken = await ToyToken.new("Toy token", "TOY");
  });

  const zeroBytes32 = `0x${'0'.repeat(64)}`;
  const zeroAddress = `0x${'0'.repeat(40)}`;
  const questionId = web3.utils.randomHex(32);
  const oracle = accounts[0];
  const outcomeSlotCount = 10;
  const partition = Array.from({ length: outcomeSlotCount }, (_, i) => 1 << i);
  const conditionId = getConditionId(oracle, questionId, outcomeSlotCount);

  let positionIds;
  before('calc position ids', async function () {
    positionIds = partition.map(indexSet => getPositionId(
      toyToken.address,
      getCollectionId(conditionId, indexSet),
    ));
  })

  before('mint tokens and junk', async function () {
    await conditionalTokens.prepareCondition(oracle, questionId, outcomeSlotCount);
    await Promise.all(accounts.map(async account => {
      await toyToken.mint(account, 100);
      await toyToken.approve(conditionalTokens.address, 100, { from: account });
      await conditionalTokens.splitPosition(
        toyToken.address,
        zeroBytes32,
        conditionId,
        partition,
        100,
        { from: account },
      );
    }));
  });
  
  let unusedId, singleId, batchIds;
  // The wrapped ERC-1155 name as hex
  let singleTokenNameAsString = "WrappedERC-1155";
  let singleTokenSymbolAsString = "dWMT";
  let singleTokenDecimals = 18;

  const emptyBytes = '0x';
  const calldataBytes = getTokenBytecode(singleTokenNameAsString, singleTokenSymbolAsString, singleTokenDecimals);

  console.log("Testing Wrapped ERC-1155:");
  console.log(`Token name: ${singleTokenNameAsString}`);
  console.log(`Token Symbol: ${singleTokenSymbolAsString}`);
  console.log(`Token decimals: ${singleTokenDecimals}`);
  console.log(`CalldataBytes: ${calldataBytes}`);

  const batchTokenNameArray = new Array();
  const batchTokenSymbolArray = new Array();
  const batchTokenDecimalsArray = new Array();
  for(let i=0; i<8; i++) {
    batchTokenNameArray.push(singleTokenNameAsString);
    batchTokenSymbolArray.push(singleTokenSymbolAsString);
    batchTokenDecimalsArray.push(singleTokenDecimals);
  }
  const batchCalldataBytes = getBatchTokenBytecode(batchTokenNameArray, batchTokenSymbolArray, batchTokenDecimalsArray);
  console.log(batchCalldataBytes);

  let unusedWrapped1155;
  let singleWrapped1155;
  let batchWrapped1155s;
  before('get token addresses', async function () {
    [unusedId, singleId, ...batchIds] = positionIds;

    console.log("UnusedID: " + unusedId);
    console.log("Single ID: " + singleId);
    console.log("Batch Id: " + batchIds);

    unusedWrapped1155 = await wrapped1155Factory.getWrapped1155(
      conditionalTokens.address,
      unusedId,
      calldataBytes
    );
    singleWrapped1155 = await wrapped1155Factory.getWrapped1155(
      conditionalTokens.address,
      singleId,
      calldataBytes
    );
    batchWrapped1155s = await Promise.all(
      batchIds.map(id => wrapped1155Factory.getWrapped1155(
        conditionalTokens.address,
        id,
        batchCalldataBytes
      ))
    );
  });
  
  it('should not have code at unused tokens', async function () {
    const code = await web3.eth.getCode(unusedWrapped1155);
    expect(code).to.equal(emptyBytes);
  });

  it('should have correctly configured Wrapped1155 artifact', async function () {
    expect(wrapped1155Impl.address).to.equal(await wrapped1155Factory.erc20Implementation());
    expect(await wrapped1155Impl.factory()).to.equal(zeroAddress);
    expect(await wrapped1155Impl.multiToken()).to.equal(zeroAddress);
    expect(await wrapped1155Impl.tokenId()).to.be.a.bignumber.that.equals('0');
    expect(await wrapped1155Impl.name()).to.equal('Wrapped ERC-1155 Implementation');
    expect(await wrapped1155Impl.symbol()).to.equal('WMT*');
    expect(await wrapped1155Impl.decimals()).to.be.a.bignumber.that.equals('18');
  });

  it('should be able to work with a single 1155 token', async function () {
    const account = accounts[0];

    const codeBefore = await web3.eth.getCode(singleWrapped1155);
    expect(codeBefore).to.equal(emptyBytes);

    await conditionalTokens.safeTransferFrom(
      account,
      wrapped1155Factory.address,
      singleId,
      20,
      calldataBytes,
      { from: account },
    );

    const codeAfter = await web3.eth.getCode(singleWrapped1155);
    expect(codeAfter).to.not.equal(emptyBytes);
    
    const token = await Wrapped1155.at(singleWrapped1155);
    expect(await token.factory()).to.equal(wrapped1155Factory.address);
    expect(await token.multiToken()).to.equal(conditionalTokens.address);
    expect(await token.tokenId()).to.be.a.bignumber.that.equals(web3.utils.toBN(singleId));
    expect(await token.name()).to.equal(singleTokenNameAsString);
    expect(await token.symbol()).to.equal(singleTokenSymbolAsString);
    expect(await token.decimals()).to.be.a.bignumber.that.equals(singleTokenDecimals.toString());

    const accountBalance1155 = () => conditionalTokens.balanceOf(account, singleId);
    const factoryBalance1155 = () => conditionalTokens.balanceOf(wrapped1155Factory.address, singleId);
    const totalWrappedSupply = () => token.totalSupply();
    const accountWrappedBalance = () => token.balanceOf(account);

    expect(await accountBalance1155()).to.be.a.bignumber.that.equals('80');
    expect(await factoryBalance1155()).to.be.a.bignumber.that.equals('20');
    expect(await totalWrappedSupply()).to.be.a.bignumber.that.equals('20');
    expect(await accountWrappedBalance()).to.be.a.bignumber.that.equals('20');

    await wrapped1155Factory.unwrap(
      conditionalTokens.address,
      singleId,
      5,
      account,
      calldataBytes,
      { from: account },
    );

    expect(await accountBalance1155()).to.be.a.bignumber.that.equals('85');
    expect(await factoryBalance1155()).to.be.a.bignumber.that.equals('15');
    expect(await totalWrappedSupply()).to.be.a.bignumber.that.equals('15');
    expect(await accountWrappedBalance()).to.be.a.bignumber.that.equals('15');
  });
  
  it('should be able to work with multiple 1155 tokens', async function () {
    const repeat = elem => new Array(batchIds.length).fill(elem)
    const account = accounts[0];

    const codeBefore = await Promise.all(batchWrapped1155s.map(
      wrapped1155 => web3.eth.getCode(wrapped1155),
    ));
    for (const code of codeBefore) {
      expect(code).to.equal(emptyBytes);
    }

    await conditionalTokens.safeBatchTransferFrom(
      account,
      wrapped1155Factory.address,
      batchIds,
      repeat(20),
      batchCalldataBytes,
      { from: account },
    );

    

    const codeAfter = await Promise.all(batchWrapped1155s.map(
      wrapped1155 => web3.eth.getCode(wrapped1155),
    ));
    for (const code of codeAfter) {
      expect(codeAfter).to.not.equal(emptyBytes);
    }
    
    const tokens = await Promise.all(batchWrapped1155s.map(
      wrapped1155 => Wrapped1155.at(wrapped1155),
    ));

    const mapBNsToNumbers = bns => bns.map(bn => bn.toNumber());
    const accountBalances1155 = () => conditionalTokens.balanceOfBatch(
      repeat(account),
      batchIds,
    ).then(mapBNsToNumbers);
    const factoryBalances1155 = () => conditionalTokens.balanceOfBatch(
      repeat(wrapped1155Factory.address),
      batchIds,
    ).then(mapBNsToNumbers);
    const totalWrappedSupplies = () => Promise.all(tokens.map(
      token => token.totalSupply(),
    )).then(mapBNsToNumbers);
    const accountWrappedBalances = () => Promise.all(tokens.map(
      token => token.balanceOf(account),
    )).then(mapBNsToNumbers);
    
    expect(await accountBalances1155()).to.eql(repeat(80));
    expect(await factoryBalances1155()).to.eql(repeat(20));
    expect(await totalWrappedSupplies()).to.eql(repeat(20));
    expect(await accountWrappedBalances()).to.eql(repeat(20));

    await wrapped1155Factory.batchUnwrap(
      conditionalTokens.address,
      batchIds,
      repeat(5),
      account,
      batchCalldataBytes,
      { from: account },
    );
    
    expect(await accountBalances1155()).to.eql(repeat(85));
    expect(await factoryBalances1155()).to.eql(repeat(15));
    expect(await totalWrappedSupplies()).to.eql(repeat(15));
    expect(await accountWrappedBalances()).to.eql(repeat(15));
  });
});
