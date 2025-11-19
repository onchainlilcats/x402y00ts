import express from "express";
import { config } from "dotenv";
import { paymentMiddleware, Resource } from "x402-express";
import { ethers } from "ethers";
import { facilitator } from "@coinbase/x402";

config();

const FACILITATOR_URL = process.env.FACILITATOR_URL as Resource;
const PAY_TO = process.env.ADDRESS as `0x${string}`;
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY!;
const RPC_URL = process.env.RPC_URL!;
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS!;
const PORT = process.env.PORT || 4021;

// NFT kontrat ABI
const NFT_ABI = [
  "function mintTo(address recipient, uint256 quantity) external",
  "function totalSupply() view returns (uint256)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(SERVER_PRIVATE_KEY, provider);
const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

console.log("Server wallet address:", signer.address);

const app = express();

// x402 middleware — tüm endpointler için
app.use(
  paymentMiddleware(
    PAY_TO,
    {
      "GET /api/mint": { 
        price: "$0.5", 
        network: "base",
        config: { description: "Mint 1 x402y00ts!" }
      },
      "GET /api/mint-10": { 
        price: "$5", 
        network: "base",
        config: { description: "Mint 10 x402y00ts!" }
      },
      "GET /api/mint-20": { 
        price: "$10", 
        network: "base",
        config: { description: "Mint 20 x402y00ts!" }
      },
      "GET /minted": {
        price: "$0.01",
        network: "base",
     
      }
    },
   facilitator
  )
);

// Helper: decode payer
function getPayerFromHeader(rawHeader: string | null): string | null {
  if (!rawHeader) return null;
  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf-8");
    const data = JSON.parse(decoded);
    return data.payload?.authorization?.from || null;
  } catch (err) {
    console.error("Failed to parse x-payment header:", err);
    return null;
  }
}

// /mint endpoint — quantity parametreli (1-20)
app.get("/mint", async (req, res) => {
  try {
    const payer = getPayerFromHeader(req.get("x-payment") ?? null);
    if (!payer) return res.status(402).json({ error: "Payment required" });

    const quantity = Number(req.query.quantity) || 1;
    if (quantity < 1 || quantity > 20) return res.status(400).json({ error: "Invalid quantity" });

    const tx = await nftContract.mintTo(payer, quantity);
    await tx.wait();

    res.json({
      mintedTo: payer,
      quantity,
      txHash: tx.hash,
      message: `Successfully minted ${quantity} NFT(s)`
    });
  } catch (err: any) {
    console.error("Error minting NFT:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// /10mint endpoint — sabit 10 NFT
app.get("/10mint", async (req, res) => {
  try {
    const payer = getPayerFromHeader(req.get("x-payment") ?? null);
    if (!payer) return res.status(402).json({ error: "Payment required" });

    const quantity = 10;
    const tx = await nftContract.mintTo(payer, quantity);
    await tx.wait();

    res.json({
      mintedTo: payer,
      quantity,
      txHash: tx.hash,
      message: "Successfully minted 10 NFTs"
    });
  } catch (err: any) {
    console.error("Error minting 10 NFTs:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// /20mint endpoint — sabit 20 NFT
app.get("/20mint", async (req, res) => {
  try {
    const payer = getPayerFromHeader(req.get("x-payment") ?? null);
    if (!payer) return res.status(402).json({ error: "Payment required" });

    const quantity = 20;
    const tx = await nftContract.mintTo(payer, quantity);
    await tx.wait();

    res.json({
      mintedTo: payer,
      quantity,
      txHash: tx.hash,
      message: "Successfully minted 20 NFTs"
    });
  } catch (err: any) {
    console.error("Error minting 20 NFTs:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// /minted endpoint — sabit fiyat $0.01
app.get("/minted", async (req, res) => {
  try {
    const payer = getPayerFromHeader(req.get("x-payment") ?? null);
    if (!payer) return res.status(402).json({ error: "Payment required" });

    // Ethers v6 artık bigint döndürüyor
    const minted: bigint = await nftContract.totalSupply();
    res.json({
      minted: minted.toString(),
      message: "Total NFTs minted so far"
    });
  } catch (err: any) {
    console.error("Error fetching minted count:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
